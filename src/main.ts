import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './shared/logging';
import { env } from 'process';

const serverPort = parseInt(env.SERVER_PORT || '7510');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  const loggerService = app.get(LoggerService);
  app.useLogger(loggerService);

  await app.listen(serverPort);
}

bootstrap().catch(console.error);
