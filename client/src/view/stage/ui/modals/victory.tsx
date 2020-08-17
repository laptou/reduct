import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { animated, config as springConfig, useSpring } from 'react-spring';

import { Modal } from '../modal';

import { createStartLevel } from '@/store/action/game';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import LevelCompleteText from '@resources/graphics/titles/level-complete.svg';
import { checkVictory } from '@/store/helper';

interface VictoryStoreProps {
  isVictory: boolean;
  nextLevel: number;
}

interface VictoryDispatchProps {
  startLevel(index: number): void;
}

const VictoryImpl: React.FC<VictoryStoreProps & VictoryDispatchProps> =
  (props) => {
    const { isVictory, nextLevel, startLevel } = props;

    const [animatedStyleProps, setAnimatedStyleProps] =
      useSpring(() => ({
        transform: 'scale(0)',
        config: springConfig.stiff,
      }));

    useEffect(() =>{
      if (isVictory)
        setAnimatedStyleProps({ transform: 'scale(1)' });
      else
        setAnimatedStyleProps({ transform: 'scale(0)' });
    }, [isVictory, setAnimatedStyleProps]);

    return isVictory ? (
      <Modal>
        <animated.div
          className='reduct-level-modal'
          style={animatedStyleProps}
        >
          <img
            src={LevelCompleteText}
            className='reduct-level-modal-title'
          />

          <div className='reduct-level-modal-actions'>
            <button
              type='button'
              onClick={() => startLevel(nextLevel)}
              className='btn btn-primary'
            >
              Next level
            </button>
          </div>
        </animated.div>
      </Modal>
    ) : null;
  };

export const VictoryOverlay = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isVictory: checkVictory(store.game.$present),
    nextLevel: store.game.$present.level + 1,
  }),
  (dispatch) => ({
    startLevel(index: number) { dispatch(createStartLevel(index)); },
  })
)(VictoryImpl);
