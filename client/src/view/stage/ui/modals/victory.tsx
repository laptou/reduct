import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { animated, config as springConfig, useSpring } from 'react-spring';

import { Modal } from '../modal';

import { createStartLevel } from '@/store/action/game';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import LevelCompleteText from '@resources/graphics/titles/level-complete.svg';

interface VictoryStoreProps {
  nextLevel: number;
}

interface VictoryDispatchProps {
  startLevel(index: number): void;
}

const VictoryImpl = (props: VictoryStoreProps & VictoryDispatchProps) => {
  const [animatedStyleProps, setAnimatedStyleProps] =
    useSpring(() => ({
      transform: 'scale(0)',
      config: springConfig.stiff,
    }));

  useEffect(() => void setAnimatedStyleProps({ transform: 'scale(1)' }));

  return (
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
            onClick={() => props.startLevel(props.nextLevel)}
            className='btn btn-primary'
          >
            Next level
          </button>
        </div>
      </animated.div >
    </Modal>
  );
};

export const VictoryOverlay = connect(
  (store: DeepReadonly<GlobalState>) => ({
    nextLevel: store.game.$present.level + 1,
  }),
  (dispatch) => ({
    startLevel(index: number) { dispatch(createStartLevel(index)); },
  })
)(VictoryImpl);
