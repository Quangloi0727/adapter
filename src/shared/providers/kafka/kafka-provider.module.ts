import { Module, Provider } from '@nestjs/common';
import { KafkaModule, KafkaService } from '../../kafka';
import { KafkaConfigService } from '../../kafka/kafka-config.service';
import { ConfigService } from '@nestjs/config';

const registerInstances = ['KAFKA'];

const imports = [];
const moduleExports = [];
const moduleProviders = [];
if ('true' === process.env.KAFKA_ENABLED) {
  imports.push(KafkaModule.registerAsync(registerInstances));
  moduleExports.push(KafkaModule);
} else {
  for (const instance of registerInstances) {
    const provider: Provider = {
      provide: instance,
      useValue: new KafkaService(undefined, new KafkaConfigService(new ConfigService())),
    };

    moduleExports.push(provider);
    moduleProviders.push(provider);
  }
}

@Module({ imports, exports: moduleExports, providers: moduleProviders })
export class KafkaProviderModule {
}
