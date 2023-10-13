import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaProviderModule, LoggerProviderModule } from './shared/providers';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [LoggerProviderModule, ConfigModule.forRoot(), KafkaProviderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
}
