import React, { useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import {
  animated, config as springConfig, ReactSpringHook, useChain, useSpring,
} from 'react-spring';

import { Logo } from '../logo';
import { Modal } from '../modal';

import { DeepReadonly } from '@/util/helper';
import { GameMode, GlobalState } from '@/store/state';
import { createStartLevel } from '@/store/action/game';
import { log } from '@/logging/logger';

interface TitleStoreProps {
  isTitle: boolean;
  level: number;
}

interface TitleDispatchProps {
  startGame(level: number): void;
}

const TitlePageImpl = (props: TitleStoreProps & TitleDispatchProps) => {
  const { isTitle, level, startGame } = props;
  const scaleSpring = useRef<ReactSpringHook>(null);
  const scaleProps =
    useSpring({
      from: {
        transform: 'scale(0)',
      },
      transform: 'scale(1)',
      config: springConfig.stiff,
      delay: 500,
      ref: scaleSpring,
    });

  const raySpring = useRef<ReactSpringHook>(null);
  const rayProps =
    useSpring({
      from: {
        progress: 0,
      },
      progress: 1,
      config: springConfig.slow,
      ref: raySpring,
    });

  useChain([scaleSpring, raySpring]);

  useEffect(() => {
    if (isTitle) {
      log('game:title');
    }
  }, [isTitle]);

  if (!isTitle)
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
    <Modal className='modal-overlay-clear'>
      <animated.div
        className='reduct-title-modal'
        style={scaleProps}
      >
        <Logo className='reduct-title-modal-title' />

        <div className='reduct-title-modal-actions'>
          <button
            type='button'
            onClick={() => startGame(level > 0 ? level : 0)}
            className='btn btn-primary'
          >
            {level > 0 ? 'RESUME' : 'START'}
          </button>
        </div>

        <svg className='reduct-title-modal-animation'>
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
                stroke='#77C8EA'
                strokeWidth='2px'
              />
            ))
          }
        </svg>
      </animated.div>
    </Modal>
  );
};

export const TitlePage = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isTitle: store.game.$present.mode === GameMode.Title,
    level: store.game.$present.level,
  }),
  (dispatch) => ({
    startGame(level: number) { dispatch(createStartLevel(level)); },
  })
)(TitlePageImpl);
