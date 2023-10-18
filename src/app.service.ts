import { Injectable } from '@nestjs/common';
import { LoggerFactory } from './shared/providers';
import { LoggerService } from './shared/logging';

@Injectable()
export class AppService {

  private readonly _log: LoggerService;

  constructor(loggerFactory: LoggerFactory) {
    this._log = loggerFactory.createLogger('MAIN');
  }

  getHello(): string {
    return 'Hello World!';
  }

  get logger(): LoggerService {
    return this._log;
  }
}
