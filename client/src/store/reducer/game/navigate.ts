import { ActionKind, ReductAction } from '../../action/game';
import { GameMode, GameState } from '../../state';

import { DeepReadonly } from '@/util/helper';

export function gameNavReducer(
  state: DeepReadonly<GameState>,
  act?: ReductAction
): DeepReadonly<GameState> {
  if (!act) return state;

  switch (act.type) {
  case ActionKind.GoToCredits: {
    return {
      ...state,
      mode: GameMode.Credits,
    };
  }

  case ActionKind.GoToGameplay: {
    return {
      ...state,
      mode: GameMode.Gameplay,
    };
  }

  case ActionKind.GoToSurvey: {
    return {
      ...state,
      mode: GameMode.Survey,
    };
  }

  default: return state;
  }
}
