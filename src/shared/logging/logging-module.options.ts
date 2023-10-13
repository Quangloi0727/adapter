import { ModuleMetadata } from '@nestjs/common';
import { LoggerOptions } from 'winston';

export interface LoggingModuleOptionsAsync
  extends LoggerOptions,
    Pick<ModuleMetadata, 'imports'> {}

export const LoggingModuleOptionsAsync = Symbol('LoggingModuleOptionsAsync');
