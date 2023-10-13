import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { KafkaOptions, Message } from './interfaces';
import { Admin, Consumer, Kafka, logLevel, Producer, RecordMetadata, SeekEntry } from 'kafkajs';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { randomUUID } from 'crypto';

import { ConsumeObjects, ConsumeOffsets, ConsumeTopics } from './kafka.decorators';
import { LoggerService } from '../logging';
import { KafkaConfigService } from './kafka-config.service';
import { KafkaJsonSchemaDeserializer } from './deserailizers/kafka-json-schema.deserializer';

export interface IKafkaService extends OnModuleDestroy, OnApplicationBootstrap {
	connect(): void | Promise<void>;

	disconnect(): void | Promise<void>;

	restart(reason?: string): void | Promise<void>;

	send(topic: string, message: { key?: any; value: any }): RecordMetadata[] | Promise<RecordMetadata[]>;
}

@Injectable()
export class KafkaService implements IKafkaService {
  private readonly _kafka: Kafka;
  private readonly _producer: Producer;
  private readonly _consumer: Consumer;
  private readonly _admin: Admin;
  private readonly _deserializer: KafkaJsonSchemaDeserializer;
  private readonly _autoConnect: boolean;
  private readonly _logger: LoggerService;
  private readonly _options: KafkaOptions;

  private moduleStopped = false;

  protected topicOffsets: Map<string, (SeekEntry & { high: string; low: string })[]> = new Map();

  constructor(logger: LoggerService, private readonly _kafkaConfigService: KafkaConfigService) {
    const options = this.buildKafkaOptions(_kafkaConfigService);
    const { client, consumer: consumerConfig, producer: producerConfig, postfixId, autoConnect } = options;

    this._logger = logger;
    this._kafka = new Kafka({ ...client });
    const { groupId } = consumerConfig;
    const consumerOptions = Object.assign({ groupId: this.includePostFix(groupId, postfixId) }, consumerConfig);

    this._autoConnect = autoConnect ?? true;
    this._consumer = this._kafka.consumer(consumerOptions);
    this._consumer.on('consumer.disconnect', async () => await this.restart('disconnect'));
    this._consumer.on('consumer.stop', async () => await this.restart('stop'));
    this._consumer.on('consumer.crash', async () => await this.restart('crash'));

    this._producer = this._kafka.producer(producerConfig);
    this._admin = this._kafka.admin();
    this._options = options;

    this._deserializer = new KafkaJsonSchemaDeserializer();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  async onApplicationBootstrap() {
    setTimeout(async () => {
      this.remapTopicNames();
      if (this._autoConnect) await this.connect();
    }, 5000);
  }

  async connect(): Promise<void> {
    await this._consumer.connect();
    await this._producer.connect();
    await this._admin.connect();

    await this.getTopicOffsets();

    ConsumeTopics.forEach((_, topic) => {
      this.subscribe(topic);

      this._logger.info('Consuming topic {} ...', topic);
    });
    await this.bindAllTopicToConsumer();
  }

  async disconnect(): Promise<void> {
    await this._consumer.disconnect();
    await this._producer.disconnect();
    await this._admin.disconnect();
  }

  async restart(reason?: string) {
    if (this.moduleStopped) return;

    this._logger?.info(KafkaService, `Kafka consumer ${reason}. Trying to restart ...`);
    await this.connect();
  }

  async send(topic: string, message: { key?: any; value: any }): Promise<RecordMetadata[]> {
    if (!(message.value instanceof String)) {
      message.value = JSON.stringify(message.value);
    }
    return await this._producer?.send({
      topic,
      messages: [message],
    });
  }

  protected getTopicName(topic: string, method: string): string {
    if (isEmpty(topic)) throw new Error(`Invalid topic in ${method} MessageListeners`);

    if (topic.startsWith('#')) {
      topic = this._kafkaConfigService.getTopic(topic.substring(1));
      if (isEmpty(topic)) throw new Error(`Cannot find configured topic in ${method} MessageListeners`);
    }

    return topic;
  }

  private remapTopicNames() {
    const consumeTopics = new Map(ConsumeTopics);
    ConsumeTopics.clear();

    consumeTopics.forEach((fn, key) => {
      const topic = this.getTopicName(key, fn?.name);
      ConsumeTopics.set(topic, fn);
    });

    const consumeObjects = new Map(ConsumeObjects);
    ConsumeObjects.clear();

    consumeObjects.forEach((fn, key) => {
      const topic = this.getTopicName(key, fn?.name);
      ConsumeObjects.set(topic, fn);

      this._logger.log(`Bind topic {} to context {}`, topic, fn?.name ?? fn);
    });

    const consumeOffsets = new Map(ConsumeOffsets);
    ConsumeOffsets.clear();

    consumeOffsets.forEach((fn, key) => {
      const topic = this.getTopicName(key, fn?.name);
      ConsumeOffsets.set(topic, fn);
    });
  }

  private buildKafkaOptions(kafkaConfigService: KafkaConfigService): KafkaOptions {
    let sasl = undefined;

    let ssl = undefined;
    if ('PLAINTEXT' !== kafkaConfigService.securityProtocol) {
      const mechanism = kafkaConfigService.saslMechanism.toLowerCase();
      const proto = (kafkaConfigService.securityProtocol ?? '').toLowerCase();
      if (proto.indexOf('ssl') >= 0) ssl = true;

      sasl = {
        mechanism,
        username: kafkaConfigService.saslAuthUser,
        password: kafkaConfigService.saslAuthPassword,
      };
    }

    return {
      client: {
        sasl,
        ssl,
        brokers: kafkaConfigService.bootstrapServers,
        clientId: this.includePostFix(kafkaConfigService.clientId),
        logLevel: logLevel.INFO,
        logCreator: () => {
          return () => {
            return async ({ namespace, level, label, log }) => {
              const { message, ...extra } = log || {};
              this._logger.log({
                level: toWinstonLogLevel(level),
                message,
                marker: namespace ?? label ?? 'KafkaService',
                ...extra,
              });
            };
          };
        },
      },
      consumer: {
        groupId: kafkaConfigService.groupId,
        retry: {
          retries: 1000,
          maxRetryTime: 3000,
          restartOnFailure: async () => true,
        },
      },
      producer: {},
    };
  }

  protected includePostFix(src: string, postfix = 'CLIENT'): string {
    if (isEmpty(src)) return randomUUID();

    return `${src}-${postfix}`;
  }

  protected async getTopicOffsets(): Promise<void> {
    const topics = ConsumeTopics.keys();

    for await (const topic of topics) {
      try {
        const topicOffsets = await this._admin.fetchTopicOffsets(topic);
        this.topicOffsets.set(topic, topicOffsets);
      } catch (e) {
        this._logger.error(KafkaService, 'Error fetching topic offset: ' + topic);
      }
    }
  }

  protected async subscribe(topic: string, fromBeginning = false): Promise<void> {
    await this._consumer.subscribe({ topic, fromBeginning });
  }

  private async bindAllTopicToConsumer(): Promise<void> {
    const runConfig = this._options.consumerRunConfig ? this._options.consumerRunConfig : {};
    await this._consumer.run({
      ...runConfig,
      autoCommit: this._kafkaConfigService.enableAutoCommit,
      autoCommitInterval: this._kafkaConfigService.autoCommitInterval,
      autoCommitThreshold: this._kafkaConfigService.autoCommitThreshold,
      eachMessage: async ({ topic, partition, message }) => {
        const objectRef = ConsumeObjects.get(topic);
        const callback = ConsumeTopics.get(topic);
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const deserialized = await this._deserializer.deserialize(message, { topic });
          const { timestamp, offset, key, value, headers } = deserialized;

          const commitCallback = this.commit(topic, partition, offset);
          const kafkaContext = {};
          if (commitCallback && this._kafkaConfigService.enableAutoCommit) kafkaContext['commit'] = commitCallback;

          await callback?.apply(objectRef, [{ timestamp, offset, key, value, headers } as Message, kafkaContext]);
        } catch (e) {
          this._logger.error(KafkaService, `Error for message ${topic}: ${e}`);
          await this.restart('each_message');
        }
      },
    });
    await this.seekTopics();
  }

  private async seekTopics() {
    for (const topic of ConsumeOffsets.keys()) {
      const topicOffsets = this.topicOffsets.get(topic);
      const seekPoint = ConsumeOffsets.get(topic);

      if (!seekPoint) continue;

      for (const topicOffset of topicOffsets) {
        let seek = String(seekPoint);
        if (seekPoint === 'earliest') seek = topicOffset.low;
        if (seekPoint === 'latest') seek = topicOffset.high;
        this._consumer.seek({
          topic,
          partition: topicOffset.partition,
          offset: seek,
        });
        this._logger.debug(KafkaService, `Seek ${topic}, ${topicOffset.partition} to ${seek}`);
      }
    }
  }

  protected commit(topic: string, partition: number, offset: number) {
    if (isEmpty(topic) || partition < 0 || offset < 0) return undefined;

    return async () => {
      await this._consumer.commitOffsets([{ topic, partition, offset: String(offset) }]);
      this._logger.debug(KafkaService, `Committed to topic ${topic}, partition ${partition}, offset ${offset}`);
    };
  }
}

const toWinstonLogLevel = (level: logLevel) => {
  switch (level) {
  case logLevel.ERROR:
  case logLevel.NOTHING:
    return 'error';
  case logLevel.WARN:
    return 'warning';
  case logLevel.INFO:
    return 'info';
  case logLevel.DEBUG:
    return 'debug';
  }
};
