import Loader from '@/loader';
import { createStartLevel } from '@/store/action';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/level.scss';
import React, { useState } from 'react';
import { connect } from 'react-redux';
import { animated, useSpring } from 'react-spring';

interface LevelMenuStoreProps {
  level: number;
}

interface LevelMenuDispatchProps {
  startLevel(level: number): void;
}

type LevelMenuProps = LevelMenuDispatchProps & LevelMenuStoreProps;

const LevelMenuImpl: React.FC<LevelMenuProps> = (props) => {
  const levels = [];

  for (let index = 0; index < Loader.progressions['Elementary'].levels.length; index++) {
    levels.push(index);
  }

  const [isOpen, setOpen] = useState(false);

  const style = useSpring({ 
    transform: isOpen ? 'translateY(0rem)' : 'translateY(20rem)'
  });

  return (
    <animated.div id='reduct-level-menu' style={style}>
      <div id='reduct-level-select'>
        {
          levels.map(index => 
            <button type='button' key={index} onClick={() => props.startLevel(index)}>
              {index + 1}
            </button>
          )
        }
      </div>
      <div id='reduct-level-info'>
        <span id='reduct-level-info-level'>Level {props.level + 1}</span>
        <span id='reduct-level-info-chapter'>Chapter X</span>
        <button id='reduct-level-info-expander' 
          type='button' 
          onClick={() => setOpen(!isOpen)}
        >
          Levels
        </button>
      </div>
    </animated.div>
  );
}

export const LevelMenu = connect(
  (store: DeepReadonly<GlobalState>) => ({
    level: store.program.$present.level
  }),
  (dispatch) => ({
    startLevel(level: number) { dispatch(createStartLevel(level)); }
  })
)(LevelMenuImpl);
