import { HttpException, HttpStatus, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { LoggerService } from '../shared/logging';
import { LoggerFactory, SftpService } from '../shared/providers';
import axios from 'axios';
import { IBodyRequest } from './recording.interface';
import * as moment from 'moment';
import { ExportExcelService } from '../export-excel/export-excel.service';
import * as fs from 'fs-extra';
import { existsSync, mkdirSync } from 'fs';
import { getDayMonthYear } from '../utils/functions';
import { RecordingStoreService } from './recording-store.service';
import * as path from 'path';

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

  constructor(
    loggerFactory: LoggerFactory,
        private readonly _configService: ConfigService,
        private readonly _exportExcelService: ExportExcelService,
        private readonly _recordingStoreService: RecordingStoreService,
        private readonly _sftpService: SftpService,
  ) {
    this._log = loggerFactory.createLogger(RecordingService);
    const timeJob = this._configService.get('TIME_START_JOB') || '0 0 1 * * *';
    this._urlGetData = this._configService.get('URL_GET_DATA');
    this._prefixRecording = this._configService.get('PREFIX_RECORDING');
    this._tenantId = this._configService.get('TENANT_ID') || '102';
    this._maxResultCount = this._configService.get('MAX_RESULT_COUNT') || 100;
    this._exportDir = this._configService.get('EXPORT_DIR');
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
      await this.downloadFileRecording(dataGetFromCrm, body?.startTime);
      if (await this._sftpService.forceConnection()) {
        await this._recordingStoreService.uploadToServer(body?.startTime);
      } else {
        this._log.error('Cannot connect to server!');
      }
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

    const downloadPromises = datas.map(async data => {
      const { recordingUrl } = data;
      if (recordingUrl && recordingUrl !== '' && recordingUrl !== null && recordingUrl !== undefined) {
        const response = await axios.get(`${this._prefixRecording}/${recordingUrl}`, { responseType: 'stream' });

        if (response.status === 200) {
          if (!existsSync(destinationPath)) mkdirSync(destinationPath, { recursive: true });

          await fs.ensureDir(destinationPath);
          const fileName = recordingUrl.split('/');

          const writer = fs.createWriteStream(`${destinationPath}/${fileName[fileName.length - 1]}`);
          response.data.pipe(writer);

          return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
        } else {
          throw new HttpException(`Failed to download the file `, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    });

    try {
      await Promise.all(downloadPromises);
      this._log.info('All downloads completed successfully.');
    } catch (error) {
      this._log.error(`An error occurred during download: ${error?.response?.statusText}`);
    }
  }
}
