import type { Context, default as Koa, DefaultState } from 'koa';
import KoaTreeRouter from 'koa-tree-router';

import { SURVEY_URI } from './config';
import { serverLogger } from './logging/server';


export function initializeSurvey(server: Koa): void {
  serverLogger.info(`using survey URI: ${SURVEY_URI}`);

  const surveyRouter = new KoaTreeRouter<DefaultState, Context>();

  surveyRouter.get(
    '/survey',
    (ctx) => {
      const netId = ctx.state.user.netId;
      const uri = new URL(SURVEY_URI);
      uri.searchParams.set('netid', netId);
      ctx.redirect(uri.toString());
    }
  );

  server.use(surveyRouter.routes());
}
