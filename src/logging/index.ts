import type { Middleware } from 'redux';
import * as Sentry from '@sentry/react';
import { ReductAction, ActionKind } from '@/store/action';

export const logMiddleware: Middleware = (api) => (next) => (act) => {
  if (!act) return next(act);

  const action = act as ReductAction;

  switch (action.type) {
  case ActionKind.StartLevel:
    Sentry.captureEvent({
      type: 'transaction',
      level: Sentry.Severity.Log,
      transaction: act.type,
      extra: { level: act.level }
    });
    break;

  case ActionKind.EvalLambda:
  case ActionKind.EvalApply:
  case ActionKind.EvalConditional:
  case ActionKind.EvalNot:
  case ActionKind.EvalOperator:
  case ActionKind.EvalReference:
  case ActionKind.Step:
  case ActionKind.Undo:
  case ActionKind.Redo:
    Sentry.captureEvent({
      type: 'transaction',
      level: Sentry.Severity.Log,
      transaction: act.type,
      extra: act
    });
    console.log('logged');
    break;

  default:
    break;
  }

  return next(act);
  
}
