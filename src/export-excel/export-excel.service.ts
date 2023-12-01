import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { Workbook } from 'exceljs';
import { getDayMonthYear } from '../utils/functions';
import { SftpService } from '../shared/providers';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { readJsonFile } from '../utils/file.utils';

@Injectable()
export class ExportExcelService {
  private readonly _exportDir: string;
  private readonly _fileHeaderDir: string;
  constructor(
    private readonly _sftpService: SftpService,
    private readonly _configService: ConfigService
  ) {
    this._exportDir = this._configService.get('EXPORT_DIR');
    this._fileHeaderDir = this._configService.get('FILE_HEADER_DIR');
  }

  async exportFileCsv(data, startTime?) {
    const { fileHeader } = await readJsonFile(this._fileHeaderDir);
    const workbook = new Workbook();
    const headers = fileHeader.columns;
    const workSheet = workbook.addWorksheet('data');
    workSheet.columns = headers;

    for (const header of headers) {
      workSheet.getRow(1).getCell(header.key).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      workSheet.getRow(1).getCell(header.key).font = { bold: true };

      workSheet.getRow(1).getCell(header.key).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'ADD8E6' }
      };
    }

    workSheet.addRows(data);

    const dir = path.join(this._exportDir, getDayMonthYear(startTime).year, getDayMonthYear(startTime).month, getDayMonthYear(startTime).day);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    await this._sftpService.mkdirIfNotExists(path.join(getDayMonthYear(startTime).year, getDayMonthYear(startTime).month, getDayMonthYear(startTime).day, 'recording'));

    const filePath = path.join(dir, `${getDayMonthYear(startTime).valueOf.toString()}.csv`);
    return workbook.xlsx.writeFile(filePath);
  }

};
