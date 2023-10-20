import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { Workbook } from 'exceljs';
import { exportDir } from '../constants';
import { getDayMonthYear } from '../common/functions';
import { SftpService } from '../shared/providers';
import { ConfigService } from '@nestjs/config';
const { fileHeader } = require('../../config/config-map.json');

@Injectable()
export class ExportExcelService {
  constructor(
    private readonly _sftpService: SftpService,
  ) {}

  async exportFileCsv(data) {
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

    const dir = `${exportDir}/${getDayMonthYear().year}/${getDayMonthYear().month}/${getDayMonthYear().day}`;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    await this._sftpService.mkdirIfNotExists(`${getDayMonthYear().year}/${getDayMonthYear().month}/${getDayMonthYear().day}/recording`);

    const filePath = `${dir}/${getDayMonthYear().valueOf}.csv`;
    return workbook.xlsx.writeFile(filePath);
  }

}
