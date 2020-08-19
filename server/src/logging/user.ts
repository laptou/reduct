import { createLogger, transports, format } from 'winston';
import { LoggingWinston as GCloudLogging } from '@google-cloud/logging-winston';
import KoaTreeRouter from 'koa-tree-router';
import { Context } from 'koa';

import { USE_REMOTE_LOGGING, ENV } from '../config';

export const userLogger = createLogger({
  level: 'verbose',
});

if (USE_REMOTE_LOGGING) {
  userLogger.add(new GCloudLogging({
    logName: 'user',
  }));
}

if (ENV === 'dev' || !USE_REMOTE_LOGGING) {
  userLogger.add(new transports.Console({
    level: 'debug',
    format: format.combine(
      format.align(),
      format.label({ label: 'user' }),
      format.printf(({ level, message, label }) => {
        return `[${label as string}] ${level}: ${message}`;
      }),
      format.colorize({
        colors: { info: 'gray' },
        all: true,
      })
    ),
  }));
}

export const userLoggingRouter = new KoaTreeRouter<any, Context>();

userLoggingRouter.post('/logs/action', (ctx) => {
  const logEntries = ctx.request.body;
  const user = ctx.state.user;

  for (const logEntry of logEntries) {
    userLogger.info(`${user?.netId ?? 'unknown'}:${logEntry.action}`, {
      netId: user.netId,
      ...logEntry,
    });
  }

  ctx.response.status = 200;
});

