import { DynamicModule, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { LoggerFactory } from '../providers/logger/logger.factory';
import { KafkaConfigService } from './kafka-config.service';
import { ConfigModule } from '@nestjs/config';
import { LoggerProviderModule } from '../providers';

@Module({})
export class KafkaModule {
  public static registerAsync(instances: Array<string | symbol>, dependsOn?: DynamicModule[]): DynamicModule {
    const clients = [];
    for (const instance of instances) {
      clients.push({
        provide: instance,
        useFactory: async (
          loggerFactory: LoggerFactory,
          kafkaConfigService: KafkaConfigService,
        ) => {
          const logger = loggerFactory.createLogger(KafkaService);
          logger.info(`Registering kafka service named ${instance.toString()}`);

          return new KafkaService(logger, kafkaConfigService);
        },
        inject: [LoggerFactory, KafkaConfigService],
        imports: [ConfigModule.forRoot(), LoggerProviderModule],
      });
    }

    return {
      module: KafkaModule,
      imports: [ConfigModule.forRoot(), LoggerProviderModule, ...(dependsOn || [])],
      providers: [...clients],
      exports: [...clients],
    };
  }
}
