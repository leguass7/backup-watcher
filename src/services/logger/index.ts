import { join } from 'path';
import { createLogger, transports, format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const customFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level} ${message}`;
});

export const loggerLevels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };

export function factoryLogger(path: string) {
  const dirname = join(path, 'backup-watcher');
  /**
   * @see https://medium.com/@akshaypawar911/how-to-use-winston-daily-rotate-file-logger-in-nodejs-1e1996d2d38
   */
  const daillyRotateOpts = {
    dirname,
    filename: `logs-%DATE%.log`,
    auditFile: join(dirname, 'log-backup-watcher-config-audit.json'),
    datePattern: 'YYYY-MM-DD',
    frequency: '1d',
    zippedArchive: true,
    maxSize: '1m',
    maxFiles: '7d',
  };

  const deletedOpt = {
    ...daillyRotateOpts,
    filename: `deleted-%DATE%.log`,
    auditFile: join(dirname, 'deleted-backup-watcher-config-audit.json'),
  };

  const Logger = createLogger({
    exitOnError: false,
    format: format.combine(format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), customFormat),
    transports: [new DailyRotateFile(daillyRotateOpts), new transports.Console()],
    levels: loggerLevels,
  });

  const logging = (...args: any[]) => {
    return Logger.info(args.join(' '));
  };

  return {
    deletedLogger: createLogger({
      exitOnError: false,
      format: format.combine(format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), customFormat),
      transports: [new DailyRotateFile(deletedOpt), new transports.Console()],
      levels: loggerLevels,
    }),
    Logger,
    logging,
  };
}

export type FactoryLogger = ReturnType<typeof factoryLogger>;
