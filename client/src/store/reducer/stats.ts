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
      state.startTime = new Date().getTime();
    }

    if (state.current?.levelIndex !== act.level) {
      let newStats;
      let newLevels;

      if (state.levels.has(act.level)) {
        newStats = state.levels.get(act.level)!;
        newStats.resumeTime = new Date().getTime();
      } else {
        newStats = {
          levelIndex: act.level,
          playDuration: null,
          totalDuration: null,
          startTime: new Date().getTime(),
          resumeTime: new Date().getTime(),
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
                - state.current.startTime,
              playDuration:
                new Date().getTime()
                - state.current.resumeTime
                + (state.current.playDuration ?? 0),
            },
          ],
        ]);
      } else {
        newLevels = state.levels;
      }

      return {
        ...state,
        current: newStats,
        levels: newLevels,
      };
    }

    return state;
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
              - state.current.startTime,
            playDuration:
              new Date().getTime()
              - state.current.resumeTime
              + (state.current.playDuration ?? 0),
            complete: true,
          },
        ],
      ]);
    } else {
      newLevels = state.levels;
    }

    return {
      ...state,
      current: null,
      levels: newLevels,
    };
  }

  default:
    return state;
  }
};
