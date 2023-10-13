import { Inject, Injectable, Type } from '@nestjs/common';
import * as winston from 'winston';
import { LoggingModuleOptionsAsync, LoggerService } from '../../logging';

@Injectable()
export class LoggerFactory {
  private readonly options: LoggingModuleOptionsAsync;

  constructor(@Inject(LoggingModuleOptionsAsync) options: LoggingModuleOptionsAsync) {
    this.options = options;
  }

  createLogger(marker: Type | string = 'main'): LoggerService {
    const logger = winston.createLogger(this.options);

    return new LoggerService(logger, marker);
  }
}
