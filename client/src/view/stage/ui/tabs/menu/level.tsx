import React, { useMemo } from 'react';
import { connect } from 'react-redux';

import { GameTimer } from './timer';

import { createStartLevel } from '@/store/action/game';
import { GlobalState, LevelCompletionStats } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/level.scss';
import { progression, getChapterByLevelIndex } from '@/loader';

interface LevelSelectStoreProps {
  levelIndex: number;
  levelStats: Map<number, LevelCompletionStats>;
}

interface LevelSelectDispatchProps {
  startLevel(level: number): void;
}

interface LevelInfoStoreProps {
  levelIndex: number;
}

interface LevelInfoOwnProps {
  /**
   * Called when user clicks the button to show/hide the level selector.
   */
  onToggleLevelSelect(): void;
}

type LevelSelectProps = LevelSelectStoreProps & LevelSelectDispatchProps;
type LevelInfoProps = LevelInfoStoreProps & LevelInfoOwnProps;

const LevelSelectImpl: React.FC<LevelSelectProps> = (props) => {
  const { levelIndex, levelStats, startLevel } = props;

  const completedLevels = useMemo(
    () =>
      new Set(Array
        .from(levelStats.values())
        .filter(stats => stats.complete)
        .map(stats => stats.levelIndex)),
    [levelStats]
  );

  // calculate index for each level and calculate whether half of the levels in
  // a chapter have been completed
  let isLastChapterCompleted = true;
  let index = 0;

  const indexedChapters = progression!.chapters.map(chapter => {
    let numLevelsComplete = 0;

    const levels = chapter.levels.map(() => {
      const complete = completedLevels.has(index);
      if (complete) {
        numLevelsComplete++;
      }

      const indexedLevel = {
        index,
        complete,
      };

      index++;

      return indexedLevel;
    });

    const indexedChapter = {
      levels,
      key: chapter.key,
      name: chapter.name,
      enabled: true,
    };

    isLastChapterCompleted = numLevelsComplete >= levels.length / 2;

    return indexedChapter;
  });

  return (
    <>
      <h2>Levels</h2>
      <div id='reduct-level-select'>
        {
          indexedChapters.map(({
            levels, key, name, enabled,
          }) => (
            <div className='reduct-level-select-chapter' key={key}>
              <span className='reduct-level-select-chapter-name'>
                {name}
              </span>
              {levels.map(({ index, complete }) => (
                <button
                  type='button'
                  key={index}
                  onClick={() => startLevel(index)}
                  className={
                    index === levelIndex
                      ? 'btn btn-special'
                      : complete
                        ? 'btn btn-secondary'
                        : 'btn btn-secondary-inv'
                  }
                  disabled={!enabled}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          ))
        }
      </div>
    </>
  );
};

const LevelInfoImpl: React.FC<LevelInfoProps> = ({ levelIndex, onToggleLevelSelect }) => {
  const chapter = getChapterByLevelIndex(levelIndex);

  return (
    <div id='reduct-level-info'>
      <span id='reduct-level-info-level'>
        Level {levelIndex + 1}
      </span>
      <span id='reduct-level-info-chapter'>
        <span id='reduct-level-info-chapter-index'>Chapter {chapter.index + 1}:</span>
        &nbsp;
        <span>{chapter.name}</span>
      </span>
      <span id='reduct-level-info-time'>
        <GameTimer /> remaining
      </span>
      <button
        id='reduct-level-info-expander'
        type='button'
        onClick={() => onToggleLevelSelect()}
        className='btn btn-primary'
      >
        Levels
      </button>
    </div>
  );
};

export const LevelSelect = connect(
  (store: DeepReadonly<GlobalState>) => ({
    levelIndex: store.game.$present.level,
    levelStats: store.stats.levels,
  }),
  (dispatch) => ({
    startLevel(level: number) { dispatch(createStartLevel(level)); },
  })
)(LevelSelectImpl);

export const LevelInfo = connect(
  (store: DeepReadonly<GlobalState>) => ({
    levelIndex: store.game.$present.level,
  })
)(LevelInfoImpl);
