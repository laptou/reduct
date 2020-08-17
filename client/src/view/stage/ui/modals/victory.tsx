import React, { useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import {
  animated, config as springConfig, ReactSpringHook, useChain, useSpring,
} from 'react-spring';

import { Modal } from '../modal';

import { log } from '@/logging/logger';
import { createStartLevel } from '@/store/action/game';
import { checkVictory } from '@/store/helper';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import LevelCompleteText from '@resources/graphics/titles/level-complete.svg';

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

    const scaleSpring = useRef<ReactSpringHook>(null);
    const scaleProps =
      useSpring({
        transform: isVictory ? 'scale(1)' : 'scale(0)',
        config: springConfig.stiff,
        delay: 500,
        ref: scaleSpring,
        onStart() {
          // TODO: add audio cue
        },
      });

    const raySpring = useRef<ReactSpringHook>(null);
    const rayProps =
      useSpring({
        from: {
          progress: 0,
        },
        progress: isVictory ? 1 : 0,
        delay: 750,
        config: springConfig.slow,
        ref: raySpring,
      });

    useChain([scaleSpring, raySpring]);

    useEffect(() => {
      if (isVictory)
        log('game:victory');
    }, [isVictory]);

    if (!isVictory)
      return null;

    const rays = [];
    const numRays = 12;

    for (let i = 0; i < numRays; i++) {
      rays.push({
        angle: i / numRays * Math.PI * 2,
        start: 150 + Math.random() * 100,
        length: 150 + Math.random() * 100,
      });
    }

    return (
      <Modal>
        <animated.div
          className='reduct-level-modal'
          style={scaleProps}
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

          <svg className='reduct-level-modal-animation'>
            {
              rays.map((ray, index) => (
                <animated.line
                  key={index}
                  x1={Math.cos(ray.angle) * ray.start}
                  y1={Math.sin(ray.angle) * ray.start}
                  x2={Math.cos(ray.angle) * (ray.start + ray.length)}
                  y2={Math.sin(ray.angle) * (ray.start + ray.length)}
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

export const VictoryOverlay = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isVictory: checkVictory(store.game.$present),
    currentLevel: store.game.$present.level,
  }),
  (dispatch) => ({
    startLevel(index: number) { dispatch(createStartLevel(index)); },
  })
)(VictoryImpl);
