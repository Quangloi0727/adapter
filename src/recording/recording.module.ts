import { Module } from '@nestjs/common';
import { RecordingService } from './recording.service';
import { RecordingController } from './recording.controller';
import { ConfigModule } from '@nestjs/config';
import { LoggerProviderModule, SftpProviderModule } from '../shared/providers';
import { ExportExcelModule } from '../export-excel/export-excel.module';
import { RecordingStoreService } from './recording-store.service';

@Module({
  imports: [
    ConfigModule,
    LoggerProviderModule,
    ExportExcelModule,
    SftpProviderModule,
  ],
  controllers: [RecordingController],
  providers: [RecordingService, RecordingStoreService],
})
export class RecordingModule { }
