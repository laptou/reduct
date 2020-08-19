import { createLogger, transports, format } from 'winston';
import { LoggingWinston as GCloudLogging } from '@google-cloud/logging-winston';

import { ENV, USE_REMOTE_LOGGING } from '../config';

export const serverLogger = createLogger({
  level: 'info',
});

if (USE_REMOTE_LOGGING) {
  serverLogger.add(new GCloudLogging({
    logName: 'server',
  }));
}

if (ENV === 'dev' || !USE_REMOTE_LOGGING) {
  serverLogger.add(new transports.Console({
    level: 'debug',
    format: format.combine(
      format.label({ label: 'server' }),
      format.printf(({ level, message, label }) => {
        return `[${label as string}] ${level}: ${message}`;
      }),
      format.colorize({
        colors: {
          silly: 'gray dim',
          debug: 'gray',
          verbose: 'white',
          http: 'white',
          info: 'blue',
          warning: 'yellow',
          error: 'red',
        },
        all: true,
      })
    ),
  }));
}
