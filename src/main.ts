import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './shared/logging';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  const loggerService = app.get(LoggerService);
  app.useLogger(loggerService);

  await app.listen(3000);
}

bootstrap().catch(console.error);
