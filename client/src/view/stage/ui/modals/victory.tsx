import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { animated, config as springConfig, useSpring } from 'react-spring';

import { Modal } from '../modal';

import { createStartLevel } from '@/store/action/game';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import LevelCompleteText from '@resources/graphics/titles/level-complete.svg';
import { checkVictory } from '@/store/helper';
import Audio from '@/resource/audio';
import { log } from '@/logging/logger';

interface VictoryStoreProps {
  isVictory: boolean;
  currentLevel: number;
}

interface VictoryDispatchProps {
  startLevel(index: number): void;
}

const VictoryImpl: React.FC<VictoryStoreProps & VictoryDispatchProps> =
  (props) => {
    const { isVictory, currentLevel, startLevel } = props;

    const animatedStyleProps =
      useSpring({
        transform: isVictory ? 'scale(1)' : 'scale(0)',
        config: springConfig.stiff,
        delay: 1000,
        onStart() {
          // TODO: add audio cue
        },
      });

    useEffect(() => {
      if (isVictory)
        log('game:victory');
    }, [isVictory]);

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
              onClick={() => startLevel(currentLevel + 1)}
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
    currentLevel: store.game.$present.level,
  }),
  (dispatch) => ({
    startLevel(index: number) { dispatch(createStartLevel(index)); },
  })
)(VictoryImpl);
