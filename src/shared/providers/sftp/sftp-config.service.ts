import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SftpConfigService {
  constructor(private readonly _configService: ConfigService) {
  }

  get baseDir(): string {
    return this._configService.get<string>('SFTP_BASE', join('/', 'home', this.username));
  }

  get host(): string {
    const str = this._configService.get<string>('SFTP_HOST', '');

    if (!str || str.trim().length === 0) throw Error('Sftp host required');

    return str;
  }

  get port(): number {
    return this._configService.get<number>('SFTP_PORT', 22);
  }

  get username(): string {
    return this._configService.get<string>('SFTP_USERNAME', '');
  }

  get password(): string {
    return this._configService.get<string>('SFTP_PASSWORD', '');
  }

  get privateKey(): string {
    return this._configService.get<string>('SFTP_PRIVATE_KEY');
  }

  get passphrase(): string {
    return this._configService.get<string>('SFTP_PASSPHRASE');
  }

  get debug(): boolean {
    const _debug = this._configService.get('SFTP_DEBUG', false);
    if (typeof(_debug) === 'string') return _debug.toLowerCase() === 'true';

    return _debug;
  }

  get keepaliveInterval(): number {
    return this._configService.get<number>('SFTP_KEEPALIVE_INTERVAL', 10000);
  }
}
