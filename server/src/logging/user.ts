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
  const data = ctx.request.body;
  const user = ctx.state.user;

  userLogger.info(`${user.netId as string}:${data.action as string}`, {
    netId: user.netId,
    data,
  });

  ctx.response.status = 200;
});

