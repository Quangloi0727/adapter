import { Injectable } from '@nestjs/common';
import { SftpClientService } from 'nest-sftp';
import { dirname, join } from 'path';
import { LoggerService } from 'src/shared/logging';
import { LoggerFactory } from '../logger';
import { SftpConfigService } from './sftp-config.service';
import { Metadata, UploadStat } from './sftp.interface';
import { getFileName, getRelPath, readFile } from '../../../utils/file.utils';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { ConfigService } from '@nestjs/config';
import { SftpOptionsFactory } from './sftp.options';
import * as SftpClient from 'ssh2-sftp-client';

@Injectable()
export class SftpService {
  private readonly _baseDir: string;
  private readonly _uploadBaseDir: string;
  private readonly _sftpService: SftpClientService;
  private readonly _log: LoggerService;
  private readonly sftp: any;

  constructor(
    loggerFactory: LoggerFactory,
    sftpConfig: SftpConfigService,
    sftpService: SftpClientService,
    private readonly _configService: ConfigService,
    private readonly _sftpOptionsFactory: SftpOptionsFactory,
  ) {
    this._log = loggerFactory.createLogger(SftpService);
    this._sftpService = sftpService;
    this._baseDir = this._configService.get('BASE_DIR');
    this._uploadBaseDir = sftpConfig.baseDir;
    this.sftp = new SftpClient();
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

  async getListOfFolders(path): Promise<string[]> {
    try {
      const foldersList = await this._sftpService.list(path);

      return foldersList.map(item => item.name);
    } catch (error) {
      this._log.error('Get list path error is,', error);
      await this.connectToSftp();
    }
  }

  private async connectToSftp(): Promise<void> {
    try {
      const options = this._sftpOptionsFactory.createOptions();
      await this._sftpService.resetConnection(options);
      await this._sftpService.connect(options);
      this.sftp.on('connected', () => {
        this._log.info('SFTP client connected !');
      });

      this.sftp.on('error', async (err) => {
        console.error('SFTP client error:', err);
        await this._sftpService.connect(options);
      });

    } catch (error) {
      this._log.error('Error connecting to SFTP:', error);
      throw error;
    }
  }
}
