import { ConsumerConfig, ConsumerRunConfig, KafkaConfig, ProducerConfig } from 'kafkajs';
import { ModuleMetadata, Type } from '@nestjs/common';
import * as Buffer from 'buffer';

export interface KafkaMessage<TKey, TValue> {
  magicByte: number;
  timestamp: number;
  partition: number;
  offset: number;
  key: TKey;
  value: TValue;
  headers: Record<string, any>;
}

export type BufferMessage = KafkaMessage<Buffer, Buffer>;

export type Message = KafkaMessage<any, any>;

export interface KafkaOptions {
  client: KafkaConfig;
  consumer: ConsumerConfig;
  consumerRunConfig?: ConsumerRunConfig;
  producer?: ProducerConfig;
  autoConnect?: boolean;
  postfixId?: string;
}

export interface KafkaAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<KafkaOptionsFactory>;
  useClass?: Type<KafkaOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<KafkaOptions[]> | KafkaOptions[];
}

export const KafkaOptions = Symbol('KafkaOptions');

export interface KafkaOptionsFactory {
  creatKafkaModuleOptions(): Promise<KafkaOptions[]> | KafkaOptions[];
}
