import React from 'react';
import { connect } from 'react-redux';

import { createStartLevel } from '@/store/action/game';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';

import '@resources/style/react/ui/level.scss';
import { progression, getChapterByLevelIndex } from '@/loader';

import { GameTimer } from './timer';

interface LevelMenuStoreProps {
  levelIndex: number;
}

interface LevelSelectDispatchProps {
  startLevel(level: number): void;
}

interface LevelInfoOwnProps {
  /**
   * Called when user clicks the button to show/hide the level selector.
   */
  onToggleLevelSelect(): void;
}

type LevelSelectProps = LevelMenuStoreProps & LevelSelectDispatchProps;
type LevelInfoProps = LevelMenuStoreProps & LevelInfoOwnProps;

const LevelSelectImpl: React.FC<LevelSelectProps> = (props) => {
  // calculate index for each level

  let index = 0;
  const indexedChapters = progression!.chapters.map(chapter => {
    return {
      levels: chapter.levels.map(() => index++),
      key: chapter.key,
      name: chapter.name,
    };
  });

  return (
    <div id='reduct-level-select'>
      {
        indexedChapters.map(({ levels, key, name }) => (
          <div className='reduct-level-select-chapter' key={key}>
            <span className='reduct-level-select-chapter-name'>
              {name}
            </span>
            {levels.map(index => (
              <button
                type='button'
                key={index}
                onClick={() => props.startLevel(index)}
                className={
                  index === props.levelIndex
                    ? 'btn btn-primary'
                    : 'btn btn-primary-inv'
                }
              >
                {index + 1}
              </button>
            ))}
          </div>
        ))
      }
    </div>
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
