import { Module } from '@nestjs/common';
import { ExportExcelService } from './export-excel.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ExportExcelService],
  exports: [ExportExcelService]
})
export class ExportExcelModule { }
