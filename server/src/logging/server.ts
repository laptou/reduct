import { createLogger, transports, format } from 'winston';
import { LoggingWinston as GCloudLogging } from '@google-cloud/logging-winston';

import { environment } from '../config';

export const serverLogger = createLogger({
  level: 'info',
});

serverLogger.add(new GCloudLogging({
  logName: 'server',
}));

if (environment === 'dev') {
  serverLogger.add(new transports.Console({
    level: 'debug',
    format: format.combine(
      format.label({ label: 'server' }),
      format.printf(({ level, message, label }) => {
        return `[${label}] ${level}: ${message}`;
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
      }),
    ),
  }));
}
