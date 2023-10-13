import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggingModuleOptionsAsync } from './logging-module.options';

@Global()
@Module({})
export class LoggingModule {
  static registerAsync(
    loggerOptions: LoggingModuleOptionsAsync,
  ): DynamicModule {
    return {
      module: LoggingModule,
      providers: [
        {
          provide: LoggingModuleOptionsAsync,
          useValue: loggerOptions,
        },
      ],
      exports: [LoggingModuleOptionsAsync],
      global: true,
    };
  }
}
