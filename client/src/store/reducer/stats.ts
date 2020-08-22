import { ActionKind, ReductAction } from '../action/game';
import { StatsState } from '../state';

const initialState: StatsState = {
  levels: new Map(),
  current: null,
  startTime: null,
};

export const statsReducer = (
  state: StatsState = initialState,
  act?: ReductAction
): StatsState => {
  if (!act) return state;

  switch (act.type) {
  case ActionKind.StartLevel: {
    if (state.startTime === null) {
      state.startTime = new Date();
    }

    if (state.current?.levelIndex !== act.level) {
      let newStats;
      let newLevels;

      if (state.levels.has(act.level)) {
        newStats = state.levels.get(act.level)!;
        newStats.resumeTime = new Date();
      } else {
        newStats = {
          levelIndex: act.level,
          playDuration: null,
          totalDuration: null,
          startTime: new Date(),
          resumeTime: new Date(),
          complete: false,
        };
      }

      // commit current level stats to level dictionary and replace current
      // with level stats for the level that we are now playing
      if (state.current) {
        newLevels = new Map([
          ...state.levels,
          [
            state.current.levelIndex, {
              ...state.current,
              totalDuration:
                new Date().getTime()
                - state.current.startTime.getTime(),
              playDuration:
                new Date().getTime()
                - state.current.resumeTime.getTime()
                + (state.current.playDuration ?? 0),
            },
          ],
        ]);
      } else {
        newLevels = state.levels;
      }

      state = {
        ...state,
        current: newStats,
        levels: newLevels,
      };
    }
  }
  case ActionKind.CompleteLevel: {
    let newLevels;

    if (state.current) {
      newLevels = new Map([
        ...state.levels,
        [
          state.current.levelIndex, {
            ...state.current,
            totalDuration:
              new Date().getTime()
              - state.current.startTime.getTime(),
            playDuration:
              new Date().getTime()
              - state.current.resumeTime.getTime()
              + (state.current.playDuration ?? 0),
            complete: true,
          },
        ],
      ]);
    } else {
      newLevels = state.levels;
    }

    state = {
      ...state,
      current: null,
      levels: newLevels,
    };
  }
  default:
    return state;
  }
};
