import { Datacenter, datadogRum } from '@datadog/browser-rum';
import type { Middleware } from 'redux';

import { flushLogs, log } from './logger';

import { ActionKind, ReductAction } from '@/store/action/game';
import { GlobalState } from '@/store/state';
import { unflatten } from '@/util/nodes';
import { PreferenceActionKind, PreferenceAction } from '@/store/action/preferences';

datadogRum.init({
  applicationId: 'e09f9042-041e-41a9-9166-c6be692e800e',
  clientToken: 'pub9dcf719ddddfa38362afb035bdfa773a',
  datacenter: Datacenter.US,
  sampleRate: 100,
  env: PKG_ENV,
  version: PKG_VERSION,
});

export const logMiddleware: Middleware =
  (api) => (next) => (act: ReductAction | PreferenceAction) => {
    const nextAct = next(act) as unknown as ReductAction | PreferenceAction;
    const newState = api.getState() as unknown as GlobalState;
    const lastState = newState.game.$past.length > 0 ? newState.game.$past[0] : null;
    const presentState = newState.game.$present;
    const errorState = newState.game.$error;

    switch (act.type) {
    case ActionKind.Undo: log('game:undo'); break;
    case ActionKind.Redo: log('game:redo'); break;

    case ActionKind.Detach:
      // use version from lastState so we have access to parent and parentField
      const detachedNode = unflatten(act.nodeId, lastState!.nodes);

      log('game:detach', {
        nodes: {
          detached: detachedNode,
        },
        error: errorState,
      });
      break;

    case ActionKind.Execute:
      const added = Array
        .from(presentState.added)
        .map(([addedNodeId, sourceNodeId]) => ({
          node: unflatten(addedNodeId, presentState.nodes),
          source: sourceNodeId,
        }));

      const removed = Array
        .from(presentState.removed)
        .map(([removedNodeId]) => ({
          node: unflatten(removedNodeId, presentState.nodes),
        }));

      log('game:execute', {
        nodes: {
          // use version from lastState b/c targetNode might have been deleted as
          // a result of executing it
          executed: unflatten(act.targetNodeId, lastState!.nodes),
          added,
          removed,
        },
        error: errorState,
      });
      break;

    case ActionKind.Stop: {
      log('game:stop');
      break;
    }

    case ActionKind.StartLevel:
      log('game:start-level', {
        level: presentState.level,
      });
      flushLogs();
      break;

    case ActionKind.MoveNodeToBoard:
      log('game:move-node-to-board', {
        nodes: {
          moved: unflatten(act.nodeId, presentState.nodes),
        },
        error: errorState,
      });
      break;

    case ActionKind.MoveNodeToDefs:
      log('game:move-node-to-defs', {
        nodes: {
          moved: unflatten(act.nodeId, presentState.nodes),
        },
        error: errorState,
      });
      break;

    case ActionKind.MoveNodeToSlot:
      log('game:move-node-to-slot', {
        nodes: {
          moved: unflatten(act.nodeId, presentState.nodes),
        },
        error: errorState,
      });
      break;

    case PreferenceActionKind.EnableResearch: {
      log('research:consent', {
        consent: newState.preferences.enableResearch,
      });
      flushLogs();
    }
    }

    return nextAct;
  };

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible')
    log('window:focus');
  else
    log('window:blur');

  flushLogs();
});

window.addEventListener('beforeunload', () => {
  log('session:end');
  flushLogs();
});

log('session:start');
