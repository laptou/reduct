import { createLogger } from 'winston';
import { LoggingWinston as GCloudLogging } from '@google-cloud/logging-winston';

export const serverLogger = createLogger({
  level: 'info',
});

serverLogger.add(new GCloudLogging({
  logName: 'server',
}));
