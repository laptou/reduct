import Loader from '@/loader';
import { createStartLevel } from '@/store/action';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/level.scss';
import React from 'react';
import { connect } from 'react-redux';

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
  const levels = [];

  for (let index = 0; index < Loader.progressions['Elementary'].levels.length; index++) {
    levels.push(index);
  }

  return (
    <div id='reduct-level-select'>
      {
        levels.map(index => (
          <button 
            type='button' 
            key={index} 
            onClick={() => props.startLevel(index)}
          >
            {index + 1}
          </button>
        ))
      }
    </div>
  );
}

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
  )
}

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
