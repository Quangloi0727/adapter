import { dirname, join } from 'path';
import { Injectable } from '@nestjs/common';
import { SftpClientService } from 'nest-sftp';
import { LoggerService } from '../../logging';
import { LoggerFactory } from '../logger';
import { SftpConfigService } from './sftp-config.service';
import { Metadata, UploadStat } from './sftp.interface';
import { getFileName, getRelPath, readFile } from '../../../utils/file.utils';
import { isEmpty } from '@nestjs/common/utils/shared.utils';

@Injectable()
export class SftpService {
  private readonly _baseDir: string;

  private readonly _urlPrefix: string;
  private readonly _uploadBaseDir: string;
  private readonly _sftpService: SftpClientService;

  private readonly _log: LoggerService;

  constructor(
    loggerFactory: LoggerFactory,
    sftpConfig: SftpConfigService,
    sftpService: SftpClientService,
  ) {
    this._log = loggerFactory.createLogger(SftpService);

    this._sftpService = sftpService;
    this._baseDir = sftpConfig.baseDir;

    this._log.info(`SFTP baseDir: ${this._baseDir}`);
  }

  async mkdir(...path: string[]): Promise<boolean> {
    try {
      let recursivePath = join(this._baseDir, ...path);
      if (recursivePath.startsWith('/')) {
        this._log.warn(`Remove leading slash from path ${recursivePath}`);
        recursivePath = recursivePath.substring(1);
      }

      this._log.debug(`Make directory ${recursivePath} in sftp server`);

      await this._sftpService.makeDirectory(recursivePath, true);
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
        uploadStat.location = !this._urlPrefix ? uploadAbsPath : join(this._urlPrefix, relPath);
      }
    } catch (e) {
      this._log.error(`Cannot upload file ${path} to sftp server ${this._uploadBaseDir}. Error ${e?.message}`);
    }

    return uploadStat;
  }

  private async mkdirIfNotExists(path: string): Promise<boolean> {
    if (isEmpty(path)) throw new Error(`path is required for mkdir!`);

    path = join(this._uploadBaseDir, path);

    const existsResult = await this._sftpService.exists(path);

    if (existsResult && existsResult !== 'd') throw new Error(`${path} is not a directory`);

    if (!existsResult) return await this.mkdir(path);

    return true;
  }
}
