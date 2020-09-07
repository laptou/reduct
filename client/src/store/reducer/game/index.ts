import { ActionKind, ReductAction } from '../../action/game';
import { GameMode, GameState } from '../../state';

import { gameBoardReducer } from './board';
import { gameDocReducer } from './docs';
import { gameEvalReducer } from './eval';
import { gameLevelReducer } from './level';
import { gameNavReducer } from './navigate';

import { DeepReadonly } from '@/util/helper';

const initialProgram: GameState = {
  mode: GameMode.Tutorial,
  level: -1,
  nodes: new Map(),
  goal: new Set(),
  board: new Set(),
  toolbox: new Set(),
  globals: new Map(),
  docs: new Map(),
  added: new Map(),
  removed: new Map(),
  executing: new Set(),
  returned: [],
};

export function gameReducer(
  state: DeepReadonly<GameState> = initialProgram,
  act?: ReductAction
): DeepReadonly<GameState> {
  if (!act) return state;

  switch (act.type) {
  case ActionKind.StartLevel:
    return gameLevelReducer(state, act);

  case ActionKind.GoToCredits:
  case ActionKind.GoToGameplay:
  case ActionKind.GoToSurvey:
  case ActionKind.GoToTutorial:
  case ActionKind.GoToTitle:
    return gameNavReducer(state, act);

  case ActionKind.EvalLet:
  case ActionKind.EvalLambda:
  case ActionKind.EvalOperator:
  case ActionKind.EvalConditional:
  case ActionKind.EvalNot:
  case ActionKind.EvalApply:
  case ActionKind.EvalIdentifier:
  case ActionKind.Call:
  case ActionKind.Step:
  case ActionKind.Return:
  case ActionKind.Execute:
  case ActionKind.Stop:
    return gameEvalReducer(state, act);

  case ActionKind.Cleanup:
  case ActionKind.MoveNodeToBoard:
  case ActionKind.MoveNodeToSlot:
  case ActionKind.MoveNodeToDefs:
  case ActionKind.Raise:
  case ActionKind.AddToolboxItem:
  case ActionKind.AddGoalItem:
  case ActionKind.AddBoardItem:
  case ActionKind.ChangeGoal:
  case ActionKind.UseToolbox:
  case ActionKind.Detach:
    return gameBoardReducer(state, act);

  case ActionKind.CreateDocNodes:
  case ActionKind.DeleteDocNodes:
    return gameDocReducer(state, act);

  default: return state;
  }
}
