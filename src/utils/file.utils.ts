import { existsSync, statSync, readFile as fsReadFile, Stats } from 'fs';
import * as globStream from 'glob-stream';
import { dirname, extname, join, sep } from 'path';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import * as moment from 'moment';

export const isDir = (path: string) => statSync(path).isDirectory();
export const isFile = (path: string) => statSync(path).isFile();

export function getFileName(path: string, extInclude = true): string {
  if (!path) return undefined;

  const dirName = join(dirname(path), sep);
  const fileName = path.replace(dirName, '');

  if (!extInclude) return fileName.replace(extname(path), '');

  return fileName;
}

export function getRelPath(fullPath: string, baseDir: string): string {
  if (isEmpty(fullPath) || isEmpty(baseDir) || fullPath.indexOf(baseDir) < 0) return undefined;

  baseDir = join(baseDir, sep);
  let dir = false;
  try {
    dir = isDir(fullPath);
  } catch (e) {
  }

  const fileName = dir ? undefined : getFileName(fullPath);
  const relPath = fullPath.replace(baseDir, '');

  if (fileName) return relPath;

  return join(relPath, sep);
}

export const getFiles = async (
  glob: string,
  baseDir: string,
  limit = 1000,
  filters: ((f: string) => boolean)[] | string = undefined,
): Promise<string[]> => {
  if (!glob) return [];

  return new Promise((resolve, reject) => {
    const files: string[] = [];
    const streamer = globStream(glob, { cwd: baseDir ?? process.cwd() });

    streamer.on('data', ({ path }) => {
      if (streamer.destroying || streamer.destroyed) return;

      if (files.length >= limit) {
        streamer.destroy();
        resolve(files);
        return;
      }
      if (!isFileMatch(path, filters)) return;

      files.push(path);
    });

    streamer.once('error', reject);

    streamer.on('end', () => resolve(files));
  });
};

export const isFileMatch = (fileName: string, filters: ((f) => boolean)[] | string = undefined) => {
  if (filters && fileName) {
    if (filters instanceof String && filters.length) {
      const reg = new RegExp(filters as string, 'ig');

      return isFile(fileName) && reg.test(fileName);
    }
    if (filters instanceof Array) {
      const combine = f => {
        if (!isFile(f)) return false;
        for (const filter of filters) if (!filter(f)) return false;
        return true;
      };

      return combine(fileName);
    }

    return false;
  }

  return true;
};

export const readFile = async (path: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    if (isEmpty(path)) {
      reject(new Error(`path required for readFile`));
      return;
    }

    if (!existsSync(path)) {
      reject(new Error(`No such file with name '${path}'`));
      return;
    }

    fsReadFile(path, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(data);
    });
  });
};

export const normalizeRegex = (short = false): RegExp => {
  let pattern;
  if (short) {
    pattern = /(\d{4})\/([A-Z][a-z]{2})\/(\d{2})\//;
  } else {
    pattern = /(\d{4})\/([A-Z][a-z]{2})\/(\d{2})\/(\d{2})\//;
  }

  return pattern;
};

export const getNormalizePath = (path: string, stats?: Stats | { mtime: Date; }): string => {
  if (!path) return path;

  const shortMatches = path.match(normalizeRegex(true));
  const normalizeMatches = path.match(normalizeRegex());
  const mtime = stats?.mtime ?? new Date();

  if (shortMatches?.length && !normalizeMatches?.length) {
    const hour = mtime.getHours() < 10 ? `0${mtime.getHours()}` : `${mtime.getHours()}`;
    const fullMatch = shortMatches[0];
    if (fullMatch) {
      return path.replace(normalizeRegex(true), `${fullMatch}${hour}/`);
    }
  }

  if (!shortMatches?.length && !normalizeMatches?.length) {
    const fileName = getFileName(path);
    const fileDir = dirname(path);
    const mtimePath = moment(stats?.mtime ?? new Date()).format(`yyyy/MMM/DD/HH`);
    if (fileName) {
      return join(fileDir, mtimePath, fileName);
    }
  }

  return path;
};