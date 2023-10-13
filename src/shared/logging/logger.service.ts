import { Injectable, Type } from '@nestjs/common';
import { LoggerService as BaseLoggerService } from '@nestjs/common/services/logger.service';
import * as winston from 'winston';

@Injectable()
export class LoggerService implements BaseLoggerService {
  private readonly logger: winston.Logger;
  private readonly marker: Type | string;

  constructor(logger: winston.Logger, marker: Type | string = 'main') {
    this.logger = logger;
    this.marker = marker;
  }

  debug(message: any, ...args: any[]): any {
    if (this.logger.isDebugEnabled()) {
      this.logger.debug(message, { marker: this.marker, args });
    }
  }

  error(message: any, ...args: any[]): any {
    if (this.logger.isErrorEnabled()) {
      this.logger.error(message, { marker: this.marker, args });
    }
  }

  log(message: any, ...args: any[]): any {
    if (this.logger.isInfoEnabled()) {
      this.logger.info(message, { marker: this.marker, args });
    }
  }

  info(message: any, ...args: any[]): any {
    this.log(message, args);
  }

  verbose(message: any, ...args: any[]): any {
    if (this.logger.isVerboseEnabled()) {
      this.logger.verbose(message, { marker: this.marker, args });
    }
  }

  warn(message: any, ...args: any[]): any {
    if (this.logger.isWarnEnabled && this.logger.isWarnEnabled()) {
      this.logger.warn(message, { marker: this.marker, args });
    } else if (this.logger.warning) {
      this.logger.warning(message, { marker: this.marker, args });
    }
  }
}
