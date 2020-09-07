import React, {
  useEffect, useRef, useCallback, useState, useMemo,
} from 'react';
import { connect } from 'react-redux';
import {
  animated, config as springConfig, ReactSpringHook, useChain, useSpring,
} from 'react-spring';

import { Modal } from '../modal';

import { log } from '@/logging/logger';
import { createGoToSurvey } from '@/store/action/game';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import TimesUpText from '@resources/graphics/titles/times-up.svg';
import { playSound } from '@/resource/audio';
import { GAME_TIME_LIMIT } from '@/util/constants';

interface TimeOverlayStoreProps {
  endTime: number | null;
}

interface TimeOverlayDispatchProps {
  goToSurvey(): void;
}

const TimeOverlayImpl: React.FC<TimeOverlayStoreProps & TimeOverlayDispatchProps> =
  (props) => {
    const { endTime, goToSurvey } = props;

    const [currentTime, setCurrentTime] = useState(+new Date());

    const timerRef = useRef<number>();

    const timerCallback = useCallback(() => {
      setCurrentTime(+new Date());
    }, []);

    useEffect(() => {
      if (endTime && currentTime < endTime) {
        timerRef.current = setTimeout(timerCallback, endTime - currentTime) as unknown as number;

        return () => {
          clearTimeout(timerRef.current);
          timerRef.current = undefined;
        };
      }
    }, [currentTime, endTime, timerCallback]);

    const isElapsed = useMemo(
      () => endTime ? currentTime >= endTime : false,
      [currentTime, endTime]
    );

    const scaleSpring = useRef<ReactSpringHook>(null);
    const scaleProps =
      useSpring({
        transform: isElapsed ? 'scale(1)' : 'scale(0)',
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
        progress: isElapsed ? 1 : 0,
        delay: 750,
        config: springConfig.slow,
        ref: raySpring,
      });

    useChain([scaleSpring, raySpring]);

    useEffect(() => {
      if (isElapsed)
        log('game:time');
    }, [isElapsed]);

    if (!isElapsed)
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
            src={TimesUpText}
            className='reduct-level-modal-title'
          />

          <div className='reduct-level-modal-actions'>
            <button
              type='button'
              onClick={goToSurvey}
              className='btn btn-default'
            >
              Go to post-game survey
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
                    output: [-ray.length, ray.length],
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

export const TimeOverlay = connect(
  (state: DeepReadonly<GlobalState>) => ({
    endTime: state.stats.startTime ? +state.stats.startTime + GAME_TIME_LIMIT : null,
  }),
  (dispatch) => ({
    goToSurvey() { dispatch(createGoToSurvey()); },
  })
)(TimeOverlayImpl);
