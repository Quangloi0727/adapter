import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RecordingService } from './recording.service';

@Controller('recording')
export class RecordingController {
  constructor(private readonly recordingService: RecordingService) { }

  @Post('')
  runJob(@Body() body: any) {
    return this.recordingService.startJob(body);
  }

}
