import { createLogger, transports } from 'winston';
import { LoggingWinston as GCloudLogging } from '@google-cloud/logging-winston';
import KoaTreeRouter from 'koa-tree-router';
import { Context } from 'koa';

export const userLogger = createLogger({
  level: 'verbose',
});

userLogger.add(new GCloudLogging({
  logName: 'user',
}));

userLogger.add(new transports.Console({
}));

export const userLoggingRouter = new KoaTreeRouter<any, Context>();

userLoggingRouter.post('/logs/action', (ctx) => {
  const data = ctx.request.body;
  const user = ctx.state.user;

  userLogger.info(`${user.netId}:${data.action}`, {
    netId: user.netId,
    data,
  });

  ctx.response.status = 200;
});

