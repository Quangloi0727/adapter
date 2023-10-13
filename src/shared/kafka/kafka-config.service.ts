import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const KAFKA_CONFIG_PREFIX = 'KAFKA';

export const KafkaConfigs = {
  BootstrapServers: `${KAFKA_CONFIG_PREFIX}_BOOTSTRAP_SERVERS`,
  SchemaRegistryUrl: `${KAFKA_CONFIG_PREFIX}_SCHEMA_REGISTRY_URL`,
  SchemaRegistryUser: `${KAFKA_CONFIG_PREFIX}_SCHEMA_REGISTRY_USER`,
  SchemaRegistryPassword: `${KAFKA_CONFIG_PREFIX}_SCHEMA_REGISTRY_PASSWORD`,
  GroupId: `${KAFKA_CONFIG_PREFIX}_GROUP_ID`,
  ClientId: `${KAFKA_CONFIG_PREFIX}_CLIENT_ID`,
  EnableAutoCommit: `${KAFKA_CONFIG_PREFIX}_CONSUMER_AUTO_COMMIT`,
  AutoCommitInterval: `${KAFKA_CONFIG_PREFIX}_AUTO_COMMIT_INTERVAL`,
  AutoCommitThreshold: `${KAFKA_CONFIG_PREFIX}_AUTO_COMMIT_THRESHOLD`,
  SecurityProtocol: `${KAFKA_CONFIG_PREFIX}_SECURITY_PROTOCOL`,
  SaslMechanism: `${KAFKA_CONFIG_PREFIX}_SASL_MECHANISM`,
  SaslAuthModule: `${KAFKA_CONFIG_PREFIX}_SASL_AUTH_MODULE`,
  SaslAuthUser: `${KAFKA_CONFIG_PREFIX}_SASL_AUTH_USER`,
  SaslAuthPassword: `${KAFKA_CONFIG_PREFIX}_SASL_AUTH_PASSWORD`,
};

@Injectable()
export class KafkaConfigService {
  constructor(private _configService: ConfigService) {
  }

  get bootstrapServers(): string[] {
    return this._configService.get<string>(KafkaConfigs.BootstrapServers, 'localhost:9092').trim().split(',');
  }

  get registryHost(): string {
    return this._configService.get<string>(KafkaConfigs.SchemaRegistryUrl, undefined);
  }

  get clientId(): string {
    const clientId = this._configService.get<string>(KafkaConfigs.ClientId);
    if (!clientId) return this.groupId;

    return clientId;
  }

  get groupId(): string {
    return this._configService.get<string>(KafkaConfigs.GroupId, 'FSU');
  }

  get enableAutoCommit(): boolean {
    return this._configService.get<boolean>(KafkaConfigs.EnableAutoCommit, true);
  }

  get autoCommitInterval(): number {
    return this._configService.get<number>(KafkaConfigs.AutoCommitInterval, undefined);
  }

  get autoCommitThreshold(): number {
    return this._configService.get<number>(KafkaConfigs.AutoCommitThreshold, undefined);
  }

  get securityProtocol(): string {
    const value = this._configService.get<string>(KafkaConfigs.SecurityProtocol, undefined);

    const protocols = ['PLAINTEXT', 'SASL_PLAINTEXT', 'SASL_SSL', 'SSL'];

    if (!value || protocols.indexOf(value.toUpperCase()) < 0) return undefined;

    return value.toUpperCase();
  }

  get saslAuthModule(): string {
    const value = this._configService.get<string>(KafkaConfigs.SaslAuthModule, undefined);

    if (!value) {
      const mechanism = this.saslMechanism.toUpperCase();

      if (!mechanism) return undefined;

      if (mechanism === 'PLAIN') return 'org.apache.kafka.common.security.plain.PlainLoginModule';
      if (mechanism.indexOf('SCRAM') > -1) return 'org.apache.kafka.common.security.scram.ScramLoginModule';
      if (mechanism === 'OAUTHBEARER') return 'org.apache.kafka.common.security.oauthbearer.OAuthBearerLoginModule';
    }

    return undefined;
  }

  get saslMechanism(): string {
    return this._configService.get<string>(KafkaConfigs.SaslMechanism, 'PLAIN');
  }

  get saslAuthUser(): string {
    return this._configService.get<string>(KafkaConfigs.SaslAuthUser);
  }

  get saslAuthPassword(): string {
    return this._configService.get<string>(KafkaConfigs.SaslAuthPassword);
  }

  get schemaRegistryUser(): string {
    return this._configService.get<string>(KafkaConfigs.SchemaRegistryUser);
  }

  get schemaRegistryPassword(): string {
    return this._configService.get<string>(KafkaConfigs.SchemaRegistryPassword);
  }

  getTopic(topic: string): string {
    return this._configService.get<string>(topic);
  }
}
