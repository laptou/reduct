import { ActionKind, ReductAction } from '../../action/game';
import { GameMode, GameState } from '../../state';

import { DeepReadonly, mapIterable } from '@/util/helper';

export function gameLevelReducer(
  state: DeepReadonly<GameState>,
  act?: ReductAction
): DeepReadonly<GameState> {
  if (!act) return state;

  switch (act.type) {
  case ActionKind.StartLevel: {
    return {
      ...state,
      mode: GameMode.Gameplay,
      level: act.level,
      nodes: act.nodes,
      goal: act.goal,
      board: act.board,
      toolbox: act.toolbox,
      globals: act.globals,
      added: new Map(mapIterable(act.nodes.keys(), id => [id, null] as const)),
      removed: new Map(),
      executing: new Set(),
      returned: null,
    };
  }

  default: return state;
  }
}
