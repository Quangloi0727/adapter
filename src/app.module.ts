import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaProviderModule, LoggerProviderModule } from './shared/providers';
import { ConfigModule } from '@nestjs/config';
import { SftpProviderModule } from './shared/providers';
import { RecordingModule } from './recording/recording.module';
@Module({
  imports: [
    LoggerProviderModule,
    ConfigModule.forRoot(),
    KafkaProviderModule,
    SftpProviderModule,
    RecordingModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
}
