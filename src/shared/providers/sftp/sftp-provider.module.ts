import { Global, Module } from '@nestjs/common';
import { SftpModule as NestSftpModule } from 'nest-sftp';
import { SftpConfigService } from './sftp-config.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SftpService } from './sftp.service';
import { LoggerProviderModule } from '../logger';
import * as Client from 'ssh2-sftp-client';

@Global()
@Module({
  imports: [
    LoggerProviderModule,
    ConfigModule.forRoot(),
    NestSftpModule.forRootAsync(
      {
        useFactory: (configService: ConfigService) => {
          const sftpConfigService = new SftpConfigService(configService);
          const sftpConfig = {
            host: sftpConfigService.host,
            port: sftpConfigService.port,
            username: sftpConfigService.username,
            password: sftpConfigService.password,
            privateKey: sftpConfigService.privateKey,
            passphrase: sftpConfigService.passphrase,
          };
          const sftpClient = new Client();

          sftpClient
            .connect(sftpConfig)
            .then(() => {
              console.log('SFTP Connected !');
            })
            .catch((error) => {
              console.error('SFTP Connection Error:', error);
            });

          return sftpConfig;
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
