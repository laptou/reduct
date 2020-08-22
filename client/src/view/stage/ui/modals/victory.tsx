import React, { useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import {
  animated, config as springConfig, ReactSpringHook, useChain, useSpring,
} from 'react-spring';

import { Modal } from '../modal';

import { log } from '@/logging/logger';
import { createStartLevel, createGoToSurvey, createCompleteLevel } from '@/store/action/game';
import { checkVictory } from '@/store/helper';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import LevelCompleteText from '@resources/graphics/titles/level-complete.svg';
import { playSound } from '@/resource/audio';
import { progression } from '@/loader';

interface VictoryStoreProps {
  isVictory: boolean;
  currentLevel: number;
  nextLevel: number | null;
}

interface VictoryDispatchProps {
  startLevel(index: number): void;
  startSurvey(): void;
  completeLevel(): void;
}

const VictoryImpl: React.FC<VictoryStoreProps & VictoryDispatchProps> =
  (props) => {
    const {
      isVictory,
      nextLevel,
      currentLevel,
      startLevel,
      startSurvey,
      completeLevel,
    } = props;

    const scaleSpring = useRef<ReactSpringHook>(null);
    const scaleProps =
      useSpring({
        transform: isVictory ? 'scale(1)' : 'scale(0)',
        config: springConfig.stiff,
        delay: 500,
        ref: scaleSpring,
        onStart() {
          if (isVictory) playSound('level-complete');
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
      if (isVictory) {
        log('game:victory');
        completeLevel();
      }
    }, [completeLevel, isVictory]);

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

          {
            nextLevel !== null
              ? nextLevel < currentLevel
                ? (
                  <>
                    <p className='reduct-level-modal-text'>
                      This is the last level, but you haven&apos;t
                      completed level {nextLevel + 1} yet.
                    </p>
                    <div className='reduct-level-modal-actions'>
                      <button
                        type='button'
                        onClick={() => startLevel(nextLevel)}
                        className='btn btn-secondary'
                      >
                        Go to level {nextLevel + 1}
                      </button>
                    </div>
                  </>
                )
                : (
                  <div className='reduct-level-modal-actions'>
                    <button
                      type='button'
                      onClick={() => startLevel(nextLevel)}
                      className='btn btn-secondary'
                    >
                      Next level
                    </button>
                  </div>
                )
              : (
                <div className='reduct-level-modal-actions'>
                  <button
                    type='button'
                    onClick={() => startSurvey()}
                    className='btn btn-primary'
                  >
                    Finish game
                  </button>
                </div>
              )
          }


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
  (store: DeepReadonly<GlobalState>) => {
    const currentLevel = store.game.$present.level;

    const levels = progression!.chapters.flatMap(chapter => chapter.levels);

    let nextLevel = null;

    // loop around so that we detect levels after the one the player is
    // currently playing first, then go back to any levels the player skipped
    for (
      let i = (currentLevel + 1) % levels.length;
      i !== currentLevel;
      i = (i + 1) % levels.length
    ) {
      const stats = store.stats.levels.get(i);

      if (!stats || !stats.complete) {
        // this level has not been completed
        nextLevel = i;
        break;
      }
    }

    return {
      isVictory: checkVictory(store.game.$present),
      currentLevel,
      nextLevel,
    };
  },
  (dispatch) => ({
    startLevel(index: number) { dispatch(createStartLevel(index)); },
    startSurvey() { dispatch(createGoToSurvey()); },
    completeLevel() { dispatch(createCompleteLevel()); },
  })
)(VictoryImpl);
