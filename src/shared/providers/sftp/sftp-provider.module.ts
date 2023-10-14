import { Global, Module } from '@nestjs/common';
import { SftpModule as NestSftpModule } from 'nest-sftp';
import { SftpConfigService } from './sftp-config.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SftpService } from './sftp.service';
import { LoggerProviderModule } from '../logger';

@Global()
@Module({
  imports: [
    LoggerProviderModule,
    ConfigModule.forRoot(),
    NestSftpModule.forRootAsync(
      {
        useFactory: (configService: ConfigService) => {
          const sftpConfigService = new SftpConfigService(configService);
          return {
            host: sftpConfigService.host,
            port: sftpConfigService.port,
            username: sftpConfigService.username,
            password: sftpConfigService.password,
            privateKey: sftpConfigService.privateKey,
            passphrase: sftpConfigService.passphrase,
          };
        },
        inject: [ConfigService],
        imports: [ConfigModule.forRoot()],
      },
      false,
    ),
  ],
  providers: [SftpService, SftpConfigService],
  exports: [SftpService, SftpConfigService],
})
export class SftpProviderModule {

}
