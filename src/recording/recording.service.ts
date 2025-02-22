import { HttpException, HttpStatus, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { LoggerService } from '../shared/logging';
import { LoggerFactory } from '../shared/providers';
import axios from 'axios';
import { IBodyRequest } from './recording.interface';
import * as moment from 'moment';
import { ExportExcelService } from '../export-excel/export-excel.service';
import * as fs from 'fs-extra';
import { existsSync, mkdirSync } from 'fs';
import { getDayMonthYear } from '../utils/functions';
import { RecordingStoreService } from './recording-store.service';
import * as path from 'path';
import {  snooze } from 'src/utils/promise.utils';
import { getFileName } from 'src/utils/file.utils';

@Injectable()
export class RecordingService implements OnModuleInit, OnModuleDestroy {
  private readonly _refreshJob: CronJob<null, RecordingService>;
  private _running = false;
  private readonly _log: LoggerService;
  private readonly _urlGetData: string;
  private readonly _prefixRecording: string;
  private readonly _tenantId: string;
  private readonly _maxResultCount: number;
  private readonly _exportDir: string;
  private readonly hasAgrregateTicket: boolean;
  private readonly _batchSize: number;
  private readonly _batchDelayMs: number;

  constructor(
    loggerFactory: LoggerFactory,
    private readonly _configService: ConfigService,
    private readonly _exportExcelService: ExportExcelService,
    private readonly _recordingStoreService: RecordingStoreService
  ) {
    this._log = loggerFactory.createLogger(RecordingService);
    const timeJob = this._configService.get('TIME_START_JOB') || '0 0 1 * * *';
    this._urlGetData = this._configService.get('URL_GET_DATA');
    this._prefixRecording = this._configService.get('PREFIX_RECORDING');
    this._tenantId = this._configService.get('TENANT_ID') || '102';
    this._maxResultCount = this._configService.get('MAX_RESULT_COUNT') || 100;
    this._exportDir = this._configService.get('EXPORT_DIR');
    this.hasAgrregateTicket = this._configService.get('HAS_AGGREGATE_TICKET');
    this._batchSize = this._configService.get('BATCH_SIZE') || 10;
    this._batchDelayMs = this._configService.get('BATCH_DELAY_MS') || 1000;
    this._refreshJob = CronJob.from({
      cronTime: timeJob,
      onTick: async () => {
        if (!this._running) {
          this._running = true;
          await this.startJob();
          this._running = false;
        } else {
          this._log.error(`This job will be ignore until previous run finish!`);
        }
      },
      runOnInit: false,
      context: this,
    });
  }

  async startJob(body?: any) {
    try {
      this._log.info('Job start !');
      let count = 0;
      let dataGetFromCrm = [];
      do {
        const data = this.bodyRequest(count, body?.startTime, body?.endTime);
        const headers = this.paramsHeader();
        const response = await axios.post(`${this._urlGetData}`, data, { headers });
        if (response?.data?.result?.length) {
          dataGetFromCrm = [...dataGetFromCrm, ...response?.data?.result];
          count++;
        } else {
          count = 0;
        }
      } while (count !== 0);
      this._log.info(`Found ${dataGetFromCrm.length} data !`);
      if (!dataGetFromCrm.length) return;
      await this._exportExcelService.exportFileCsv(dataGetFromCrm, body?.startTime);

      this._log.info(`Start download recording files!`);
      await this.downloadFileRecording(dataGetFromCrm, body?.startTime);

      this._log.info(`Start upload files!`);
      await this._recordingStoreService.uploadToServer(body?.startTime);
    } catch (e) {
      this._log.error(`Job error: ${e.message}`);
    }
  }

  bodyRequest(page, startTime?, endTime?) {
    const body: IBodyRequest = {
      maxResultCount: this._maxResultCount,
      skipCount: page * this._maxResultCount,
      startTime: startTime
        ? startTime
        : moment(new Date()).subtract(1, 'days').startOf('day').format('YYYY-MM-DD HH:mm:ss'),
      endTime: endTime ? endTime : moment(new Date()).subtract(1, 'days').endOf('day').format('YYYY-MM-DD HH:mm:ss'),
      hasAgrregateTicket: Boolean(this.hasAgrregateTicket)
    };
    return body;
  }

  paramsHeader() {
    return {
      Cookie: `Abp.TenantId=${this._tenantId}`,
    };
  }

  onModuleInit() {
    this._refreshJob.start();
  }

  onModuleDestroy() {
    this._refreshJob.stop();
  }

  async downloadFileRecording(datas, startTime?) {
    this._log.info(`Prefix recording is: ${this._prefixRecording}`);
    const { year, month, day } = getDayMonthYear(startTime);
    const destinationPath = path.join(this._exportDir, year, month, day, 'recording');
    if (!existsSync(destinationPath)) mkdirSync(destinationPath, { recursive: true });

    const downloadPromises = [];

    let counter = 0;
    for (let i = 0; i < datas.length; i++) {
      downloadPromises.push(this._downloadTask(destinationPath, datas[i]));
      counter++;

      if (counter === Number(this._batchSize) || i === datas.length - 1) {
        await Promise.allSettled(downloadPromises);
        await snooze(this._batchDelayMs < 0 ? 0 : Number(this._batchDelayMs));

        counter = 0;
        downloadPromises.length = 0;
      }
    }
  }

  private async _downloadTask(destinationPath: string, data: { recordingUrl: string; }): Promise<string> {
    return await new Promise(async (resolve, reject) => {
      const { recordingUrl } = data;
      if (recordingUrl && recordingUrl !== '' && recordingUrl !== null && recordingUrl !== undefined) {
        try {
          const response = await axios.get(`${this._prefixRecording}/${recordingUrl}`, { responseType: 'stream' });

          if (response.status === 200) {
            if (!existsSync(destinationPath)) mkdirSync(destinationPath, { recursive: true });

            await fs.ensureDir(destinationPath);
            const fileName = getFileName(recordingUrl);

            const writer = fs.createWriteStream(path.join(destinationPath, fileName));
            response.data.pipe(writer);

            writer.on('finish', resolve);
            writer.on('error', (err) => {
              this._log.error(`Cannot download file ${recordingUrl}. Cause: ${err.message}`);

              reject(err);
            });
          } else {
            reject(new HttpException(`Failed to download the file `, HttpStatus.INTERNAL_SERVER_ERROR));
          }
        } catch (error) {
          this._log.error(`Cannot download file ${recordingUrl}. Catch: ${error.message}`);
          reject(error);
        }

      }
    });
  }

}