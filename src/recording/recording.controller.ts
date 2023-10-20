import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RecordingService } from './recording.service';

@Controller('recording')
export class RecordingController {
  constructor(private readonly recordingService: RecordingService) { }

  @Post('')
  runJob() {
    return this.recordingService.startJob();
  }

}
