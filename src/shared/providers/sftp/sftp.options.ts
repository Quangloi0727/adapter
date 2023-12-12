import { Injectable } from '@nestjs/common';
import { SftpConfigService } from './sftp-config.service';
import { ConfigService } from '@nestjs/config';

export interface SftpOptions {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
    autoConnect?: boolean;
}

@Injectable()
export class SftpOptionsFactory {

  private readonly _sftpConfigService: SftpConfigService;

  constructor(configService: ConfigService) {
    this._sftpConfigService = new SftpConfigService(configService);
  }

  createOptions(): SftpOptions {
    return {
      host: this._sftpConfigService.host,
      port: this._sftpConfigService.port,
      username: this._sftpConfigService.username,
      password: this._sftpConfigService.password,
      privateKey: this._sftpConfigService.privateKey,
      passphrase: this._sftpConfigService.passphrase,
    };
  }

}