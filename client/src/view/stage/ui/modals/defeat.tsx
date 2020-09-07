import React, { useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import {
  animated, config as springConfig, ReactSpringHook, useChain, useSpring,
} from 'react-spring';

import { Modal } from '../modal';

import { log } from '@/logging/logger';
import { checkDefeat, checkVictory } from '@/store/helper';
import { undo as createUndo } from '@/store/reducer/undo';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import LevelIncompleteText from '@resources/graphics/titles/level-incomplete.svg';
import { playSound } from '@/resource/audio';

interface DefeatStoreProps {
  isDefeat: boolean;
}

interface DefeatDispatchProps {
  undo(): void;
}

const DefeatImpl: React.FC<DefeatStoreProps & DefeatDispatchProps> =
  (props) => {
    const { isDefeat } = props;

    const scaleSpring = useRef<ReactSpringHook>(null);
    const scaleProps =
      useSpring({
        transform: isDefeat ? 'scale(1)' : 'scale(0)',
        config: springConfig.stiff,
        delay: 500,
        ref: scaleSpring,
        onStart() {
          if (isDefeat) playSound('level-incomplete');
        },
      });

    const raySpring = useRef<ReactSpringHook>(null);
    const rayProps =
      useSpring({
        from: {
          progress: 0,
        },
        progress: isDefeat ? 1 : 0,
        delay: 750,
        config: springConfig.slow,
        ref: raySpring,
      });

    useChain([scaleSpring, raySpring]);

    useEffect(() => {
      if (isDefeat)
        log('game:defeat');
    }, [isDefeat]);

    if (!isDefeat)
      return null;

    const rays = [];
    const numRays = 12;

    for (let i = 0; i < numRays; i++) {
      rays.push({
        hOffset: (i - numRays / 2) * 50,
        vOffset: Math.random() * -150,
        length: 250 + Math.random() * 100,
      });
    }

    return (
      <Modal>
        <animated.div
          className='reduct-level-modal'
          style={scaleProps}
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

          <svg className='reduct-level-modal-animation'>
            {
              rays.map((ray, index) => (
                <animated.line
                  key={index}
                  x1={ray.hOffset}
                  y1={ray.vOffset}
                  x2={ray.hOffset}
                  y2={ray.vOffset + ray.length}
                  strokeDasharray={`${ray.length} ${ray.length}`}
                  strokeDashoffset={rayProps.progress.interpolate({
                    range: [0, 1],
                    output: [ray.length, -ray.length],
                  })}
                  stroke='white'
                  strokeWidth='2px'
                />
              ))
            }
          </svg>
        </animated.div>
      </Modal>
    );
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
