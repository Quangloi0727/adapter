import { Global, Module } from '@nestjs/common';
import { SftpModule as NestSftpModule } from 'nest-sftp';
import { SftpConfigService } from './sftp-config.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SftpService } from './sftp.service';
import { LoggerFactory, LoggerProviderModule } from '../logger';
import { SftpOptionsFactory } from './sftp.options';

@Global()
@Module({
  imports: [
    LoggerProviderModule,
    ConfigModule.forRoot(),
    NestSftpModule.forRootAsync(
      {
        useFactory: (configService: ConfigService, loggerFactory: LoggerFactory) => {
          const logger = loggerFactory.createLogger(SftpProviderModule);
          const sftpConfigService = new SftpConfigService(configService);
          const opts = {
            host: sftpConfigService.host,
            port: sftpConfigService.port,
            username: sftpConfigService.username,
            password: sftpConfigService.password,
            privateKey: sftpConfigService.privateKey,
            passphrase: sftpConfigService.passphrase,
          };

          if (sftpConfigService.debug) {
            logger.log(`SFTP debug enabled`);
            opts['debug'] = (msg: string, ...args: any) => logger.debug(msg, args);
          }

          return opts;
        },
        inject: [ConfigService, LoggerFactory],
        imports: [ConfigModule.forRoot(), LoggerProviderModule],
      },
      false,
    ),
  ],
  providers: [SftpService, SftpConfigService, SftpOptionsFactory],
  exports: [SftpService, SftpConfigService],
})
export class SftpProviderModule {

}
