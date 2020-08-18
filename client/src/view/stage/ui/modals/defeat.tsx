import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { config as springConfig, useSpring, animated } from 'react-spring';

import { Modal } from '../modal';

import LevelIncompleteText from '@resources/graphics/titles/level-incomplete.svg';
import { DeepReadonly } from '@/util/helper';
import { GlobalState, GameMode } from '@/store/state';
import { undo as createUndo } from '@/store/reducer/undo';
import { checkDefeat, checkVictory } from '@/store/helper';
import Audio from '@/resource/audio';
import { log } from '@/logging/logger';

interface DefeatStoreProps {
  isDefeat: boolean;
}

interface DefeatDispatchProps {
  undo(): void;
}

const DefeatImpl: React.FC<DefeatStoreProps & DefeatDispatchProps> =
  (props) => {
    const { isDefeat } = props;

    const animatedStyleProps =
      useSpring({
        transform: isDefeat ? 'scale(1)' : 'scale(0)',
        config: springConfig.stiff,
        delay: 1000,
        onStart() {
          if (isDefeat)
            Audio.play('stuck');
        },
      });

    useEffect(() => {
      if (isDefeat)
        log('game:defeat');
    }, [isDefeat]);

    return isDefeat ? (
      <Modal>
        <animated.div
          className='reduct-level-modal'
          style={animatedStyleProps}
        >
          <img
            src={LevelIncompleteText}
            className='reduct-level-modal-title'
          />

          <p className='reduct-level-modal-text'>
            There are no moves remaining that would complete the level.
            Let&apos;s try something else.
          </p>

          <div className='reduct-level-modal-actions'>
            <button
              type='button'
              onClick={() => props.undo()}
              className='btn btn-default'
            >
              Undo
            </button>
          </div>
        </animated.div>
      </Modal>
    ) : null;
  };

export const DefeatOverlay = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isDefeat:
    !checkVictory(store.game.$present)
    && checkDefeat(store.game.$present),
  }), (dispatch) => ({
    undo() { dispatch(createUndo()); },
  })
)(DefeatImpl);
