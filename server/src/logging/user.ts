import { createLogger, transports, format } from 'winston';
import { LoggingWinston as GCloudLogging } from '@google-cloud/logging-winston';
import KoaTreeRouter from 'koa-tree-router';
import { Context } from 'koa';

import { useRemoteLogging, environment } from '../config';

export const userLogger = createLogger({
  level: 'verbose',
});

if (useRemoteLogging) {
  userLogger.add(new GCloudLogging({
    logName: 'user',
  }));
}

if (environment === 'dev') {
  userLogger.add(new transports.Console({
    level: 'debug',
    format: format.combine(
      format.align(),
      format.label({ label: 'user' }),
      format.printf(({ level, message, label }) => {
        return `[${label}] ${level}: ${message}`;
      }),
      format.colorize({
        colors: { info: 'gray' },
        all: true,
      }),
    ),
  }));
}

export const userLoggingRouter = new KoaTreeRouter<any, Context>();

userLoggingRouter.post('/logs/action', (ctx) => {
  const logEntries = ctx.request.body;
  const user = ctx.state.user;

  for (const logEntry of logEntries) {
    userLogger.info(`${user.netId}:${logEntry.action}`, {
      netId: user.netId,
      ...logEntry,
    });
  }

  ctx.response.status = 200;
});

