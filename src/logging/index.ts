import { ActionKind, ReductAction } from '@/store/action';
import { GameMode, GlobalState } from '@/store/state';
import { Datacenter, datadogRum } from '@datadog/browser-rum';
import type { Middleware } from 'redux';

datadogRum.init({
  applicationId: 'e09f9042-041e-41a9-9166-c6be692e800e',
  clientToken: 'pub9dcf719ddddfa38362afb035bdfa773a',
  datacenter: Datacenter.US,
  sampleRate: 100,
  env: PKG_ENV,
  version: PKG_VERSION
});

/**
 * Serializes an object into a format that can be sent to DataDog; primarily by
 * turning any iterables (Map, Set) into arrays and objects.
 * 
 * @param obj The object to serialize.
 */
function serialize(obj: any): any {
  switch (typeof obj) {
  case 'object':
  {
    if (obj === null)
      return obj;
    
    if (obj instanceof Map)
      return Object.fromEntries([...obj.entries()].map(([k, v]) => [serialize(k), serialize(v)]));

    if (typeof obj[Symbol.iterator] === 'function')
      return [...obj].map(serialize);

    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [serialize(k), serialize(v)]));
  }
  case 'symbol': return '[symbol]';
  case 'function': return '[function]';
  case 'undefined':
  case 'string':
  case 'boolean':
  case 'number':
    return obj;
  }
}

export const logMiddleware: Middleware = (api) => (next) => (act) => {
  const nextAct = next(act) as unknown as ReductAction;
  const newState = api.getState() as unknown as GlobalState;

  switch (act.type) {
  case ActionKind.Detach:
  case ActionKind.Eval:
  case ActionKind.Execute:
  case ActionKind.Undo:
  case ActionKind.Redo:
  case ActionKind.StartLevel:
  case ActionKind.Step:
  case ActionKind.MoveNodeToBoard:
  case ActionKind.MoveNodeToDefs:
  case ActionKind.MoveNodeToSlot:
    datadogRum.addUserAction(act.type, { 
      action: serialize(act), 
      result: serialize(newState.game.$present),
      error: serialize(newState.game.$error),
      level: serialize(newState.level) 
    });
    break;
  case ActionKind.DetectCompletion:
    switch (newState.game.$present.mode) {
    case GameMode.Victory:
      datadogRum.addUserAction('victory', { });
      break;
    case GameMode.Defeat:
      datadogRum.addUserAction('defeat', { });
      break;
    }
    break;
  }

  return nextAct;
};
