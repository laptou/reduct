import Loader from '@/loader';
import { createStartLevel } from '@/store/action';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/level.scss';
import React, { useState } from 'react';
import { connect } from 'react-redux';
import { animated, useSpring, useTransition } from 'react-spring';

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

  const innerStyle = useSpring({
    transform: isOpen ? 'translateY(20rem)' : 'translateY(0rem)',
    config: { mass: 1, tension: 180, friction: 14 }
  });

  const dismissTransition = useTransition(isOpen, null, {
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 }
  });

  return (
    <div id='reduct-level-menu'>
      {
        /* this element detects if the user clicks outside the dialog */
        dismissTransition.map(({ item, key, props: style }) => 
          item && <animated.div 
            id='reduct-level-dismiss'
            key={key}
            style={style}
            onClick={() => setOpen(false)}
          />
        )
      }
      {
        /* inner element needed b/c using transform css property causes
          position: absolute to not work as intended */
      }
      <animated.div id='reduct-level-menu-inner' style={innerStyle}>
        <div id='reduct-level-select'>
          {
            levels.map(index => 
              <button 
                type='button' 
                key={index} 
                onClick={() => props.startLevel(index)}
              >
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
    </div>
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
