import React from 'react';
import { connect } from 'react-redux';

import Loader from '@/loader';
import { createStartLevel } from '@/store/action/game';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';

import '@resources/style/react/ui/level.scss';

interface LevelMenuStoreProps {
  level: number;
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
  const chapters = [];

  const progression = Loader.progressions['Elementary'];
  for (const chapterKey of progression.linearChapters) { 
    const chapter = progression.chapters[chapterKey];
    const levels = [];
    for (let index = chapter.startIdx; index <= chapter.endIdx; index++) {
      levels.push(index);
    }

    chapters.push({
      levels,
      key: chapterKey,
      name: chapter.name,
    });
  }

  return (
    <div id='reduct-level-select'>
      {
        chapters.map(({ levels, key, name }) => (
          <div className='reduct-level-select-chapter' key={key}>
            <span className='reduct-level-select-chapter-name'>
              {name}
            </span>
            {levels.map(index => (
              <button 
                type='button' 
                key={index} 
                onClick={() => props.startLevel(index)}
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

const LevelInfoImpl: React.FC<LevelInfoProps> = (props) => {
  return (
    <div id='reduct-level-info'>
      <span id='reduct-level-info-level'>Level {props.level + 1}</span>
      <span id='reduct-level-info-chapter'>Chapter X</span>
      <button
        id='reduct-level-info-expander' 
        type='button' 
        onClick={() => props.onToggleLevelSelect()}
      >
        Levels
      </button>
    </div>
  );
};

export const LevelSelect = connect(
  (store: DeepReadonly<GlobalState>) => ({
    level: store.game.$present.level,
  }),
  (dispatch) => ({
    startLevel(level: number) { dispatch(createStartLevel(level)); },
  })
)(LevelSelectImpl);

export const LevelInfo = connect(
  (store: DeepReadonly<GlobalState>) => ({
    level: store.game.$present.level,
  })
)(LevelInfoImpl);
