import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { SftpClientService } from 'nest-sftp';
import { dirname, join } from 'path';
import { LoggerService } from 'src/shared/logging';
import { LoggerFactory } from '../logger';
import { SftpConfigService } from './sftp-config.service';
import { Metadata, UploadStat } from './sftp.interface';
import { getFileName, getRelPath, readFile } from '../../../utils/file.utils';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { ConfigService } from '@nestjs/config';
import { SftpOptions, SftpOptionsFactory } from './sftp.options';

@Injectable()
export class SftpService implements OnApplicationBootstrap {
  private readonly _baseDir: string;
  private readonly _uploadBaseDir: string;
  private readonly _sftpService: SftpClientService;
  private readonly _log: LoggerService;

  private readonly _sftpOptions: SftpOptions;

  private _alive = false;

  constructor(
    loggerFactory: LoggerFactory,
    sftpConfig: SftpConfigService,
    sftpService: SftpClientService,
    sftpOptionsFactory: SftpOptionsFactory,
    configService: ConfigService,
  ) {
    this._log = loggerFactory.createLogger(SftpService);
    this._sftpService = sftpService;
    this._baseDir = configService.get('BASE_DIR');
    this._uploadBaseDir = sftpConfig.baseDir;

    this._sftpOptions = sftpOptionsFactory.createOptions();
  }

  get alive() {
    return this._alive;
  }

  async onApplicationBootstrap() {
    setInterval(async () => {
      this._alive = await this.keepalive();
    }, this._sftpOptions.keepaliveInterval);
  }

  async mkdir(path: string): Promise<boolean> {
    try {
      await this._sftpService.makeDirectory(path, true);
      return true;
    } catch (e) {
      this._log.error(`Cannot make directory ${path} in sftp server. Error ${e?.message}`);
      return false;
    }
  }

  async upload(path: string, metadata?: Metadata): Promise<UploadStat> {
    const name = getFileName(path, false);
    const relPath = getRelPath(path, this._baseDir);
    const uploadDir = dirname(relPath);
    const uploadAbsPath = join(this._uploadBaseDir, relPath);
    const uploadStat: UploadStat = { takeTime: 0, success: false, relPath, key: metadata?.key || name };

    if (!(await this.mkdirIfNotExists(uploadDir))) return uploadStat;

    try {
      const buffer = await readFile(path);

      const startTime = new Date().getTime();
      const location = await this._sftpService.upload(buffer, uploadAbsPath, {});
      uploadStat.takeTime = new Date().getTime() - startTime;

      if (location) {
        uploadStat.success = true;
        uploadStat.location = uploadAbsPath;
      }
    } catch (e) {
      this._log.error(`Cannot upload file ${path} to sftp server ${this._uploadBaseDir}. Error ${e?.message}`);
    }

    return uploadStat;
  }

  async mkdirIfNotExists(path: string): Promise<boolean> {
    if (isEmpty(path)) throw new Error(`path is required for mkdir!`);

    path = join(this._uploadBaseDir, path);

    const existsResult = await this._sftpService.exists(path);

    if (existsResult && existsResult !== 'd') throw new Error(`${path} is not a directory`);

    if (!existsResult) return await this.mkdir(path);

    return true;
  }

  async getListOfFolders(path: string): Promise<string[]> {
    try {
      const foldersList = await this._sftpService.list(path);

      return foldersList.map(item => item.name);
    } catch (error) {
      this._log.error('Get list path error is,', error);
    }
  }

  async forceConnection(): Promise<boolean> {
    const listFn = async () => {
      try {
        this._log.error(`Try to connect to sftp server with options: ${JSON.stringify(this._sftpOptions)}`);
        const ls = await this._sftpService.list('/');
        console.log(`${new Date()} Day la ls: `, ls);

        return ls && ls.length > 0;
      } catch (e) {
        if ('ETIMEDOUT' === e['code'] || 'ERR_GENERIC_CLIENT' == e['code'] || 'ERR_NOT_CONNECTED' === e['code']) {
          try {
            await this._sftpService.connect(this._sftpOptions);
          } catch (e1) {
            try {
              await this._sftpService.resetConnection(this._sftpOptions);
            } catch (e2) {
              return await listFn();
            }
          }
          return await listFn();
        } else {
          throw e;
        }
      }
    };

    return Promise.resolve(await listFn());
  }

  async keepalive() {
    try {
      const stats = await this._sftpService.stat('/');
      if (stats) {
        this._log.info(`Keepalive to sftp server successfully!`);

        return true;
      }
    } catch (e) {
      this._log.error(`Cannot keepalive to sftp server. Error ${e?.message}`);
      await this.forceConnection();
    }

    return false;
  }
}
