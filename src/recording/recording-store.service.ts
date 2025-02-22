import { Injectable } from '@nestjs/common';
import { LoggerService } from '../shared/logging';
import { LoggerFactory } from '../shared/providers';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { existsSync, rmSync } from 'fs';
import { SftpService } from '../shared/providers';
import { getFileName, getFiles } from '../utils/file.utils';
import { getDayMonthYear } from '../utils/functions';
import { ConfigService } from '@nestjs/config';
import { snooze } from '../utils/promise.utils';
import * as path from 'path';
export interface UploadStats {
  key: string;
  relPath: string;
  absPath?: { s3?: string; sftp?: string; };
}

@Injectable()
export class RecordingStoreService {
  private readonly _log: LoggerService;
  private readonly _maxScanFile: number;
  private readonly _batchSize: number;
  private readonly _batchDelayMs: number;
  private readonly _exportDir: string;

  constructor(
    loggerFactory: LoggerFactory,
    private readonly _sftpService: SftpService,
    private readonly _configService: ConfigService
  ) {
    this._log = loggerFactory.createLogger(RecordingStoreService);
    this._maxScanFile = this._configService.get('MAX_SCAN_FILE') || 1024;
    this._batchSize = this._configService.get('BATCH_SIZE') || 10;
    this._batchDelayMs = this._configService.get('BATCH_DELAY_MS') || 1000;
    this._exportDir = this._configService.get('EXPORT_DIR');
  }

  uploadTask(path: string, key?: string): Promise<UploadStats> {
    return new Promise(async (resolve, reject) => {
      if (isEmpty(path) || !existsSync(path)) {
        reject(new Error(`Cannot upload file ${path}`));
        return;
      }

      key = key ?? getFileName(path, false);

      const stat: UploadStats = { key, relPath: '', absPath: {} };
      let success = false;
      try {
        const sftpResult = await this._sftpService.upload(path);
        if (sftpResult && sftpResult.success) {
          stat.relPath = sftpResult.relPath;
          stat.absPath.sftp = sftpResult.location;

          success = true;
        }
      } catch (e) {
        reject(e);
        return;
      }

      if (success === true) {
        rmSync(path, { force: true });
        this._log.debug(`\t\tFile {} removed after upload`, path);
      }

      resolve(stat);
    });
  }

  async uploadToServer(startTime?) {
    const { year, month, day } = getDayMonthYear(startTime);
    const _baseDirRecording = path.join(this._exportDir, year, month, day, 'recording');
    const wavFiles = await getFiles('**/*.wav', _baseDirRecording, this._maxScanFile, []);
    this._log.log(`Found {} wav file(s) in {}`, wavFiles.length, _baseDirRecording);

    const _baseDirCsv = path.join(this._exportDir, year, month, day,);
    const csvFiles = await getFiles('**/*.csv', _baseDirCsv, this._maxScanFile, []);
    this._log.log(`Found {} csv file(s) in {}`, csvFiles.length, _baseDirCsv);
    for (const csvFile of csvFiles) await this.uploadTask(csvFile);

    const uploadPromises = [];

    let counter = 0;
    for (let i = 0; i < wavFiles.length; i++) {
      uploadPromises.push(this.uploadTask(wavFiles[i]));
      counter++;

      if (counter === Number(this._batchSize) || i === uploadPromises.length - 1) {
        await Promise.allSettled(uploadPromises);
        await snooze(this._batchDelayMs < 0 ? 0 : Number(this._batchDelayMs));

        counter = 0;
        uploadPromises.length = 0;
      }
    }
  }
}
