import { produce } from 'immer';

import { ActionKind, ReductAction } from '../../action/game';
import { GameState } from '../../state';

import { findNodesDeep } from '@/util/nodes';
import { DeepReadonly } from '@/util/helper';

export function gameDocReducer(
  state: DeepReadonly<GameState>,
  act?: ReductAction
): DeepReadonly<GameState> {
  if (!act) return state;

  switch (act.type) {
  case ActionKind.CreateDocNodes: {
    return {
      ...state,
      nodes: new Map([...state.nodes, ...act.nodes]),
      docs: new Map([...state.docs, [act.key, act.rootId]]),
    };
  }

  case ActionKind.DeleteDocNodes: {
    const rootId = state.docs.get(act.key)!;

    if (!state.nodes.has(rootId)) return state;

    const descendants = findNodesDeep(rootId, state.nodes, () => true);

    return produce(state, draft => {
      for (const descendant of descendants) {
        draft.nodes.delete(descendant.id);
      }

      draft.docs.delete(act.key);
    });
  }

  default: return state;
  }
}
