import { Module } from '@nestjs/common';
import { ExportExcelService } from './export-excel.service';

@Module({
  providers: [ExportExcelService],
  exports: [ExportExcelService]
})
export class ExportExcelModule { }
