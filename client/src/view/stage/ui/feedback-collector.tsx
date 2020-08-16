import '@resources/style/react/ui/feedback.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { animated, config, useTransition } from 'react-spring';

import { log } from '@/logging/logger';

// interval at which the feedback collector appears in ms
const FEEDBACK_COLLECTOR_INTERVAL = 1 * 1000;

export const FeedbackCollectorPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const sendFeedback = useCallback((affect: string) => {
    log('user:feedback', { affect });
    setIsVisible(false);
  }, [setIsVisible]);

  useEffect(() => {
    if (!isVisible) {
      setTimer(
        setTimeout(
          () => {
            setIsVisible(true);
          },
          FEEDBACK_COLLECTOR_INTERVAL
        )
      );
    }
  }, [isVisible]);

  useEffect(() => {
    if (timer !== null) {
      return () => clearInterval(timer);
    }
  }, [timer]);

  const transition = useTransition(isVisible, null, {
    from: {
      transform: 'translateX(100%) translateX(1rem)',
      opacity: 0,
    },
    enter: {
      transform: 'translateX(0%) translateX(0rem)',
      opacity: 1,
    },
    leave: {
      transform: 'translateX(100%) translateX(1rem)',
      opacity: 0,
    },
    config: config.gentle,
  });

  const feedbackTypes = [
    ['confident', 'Confident'],
    ['neutral', 'Neutral'],
    ['confused', 'Confused'],
    ['bored', 'Bored'],
    ['anxious', 'Anxious'],
    ['frustrated', 'Frustrated'],
  ];

  return (
    <div id='reduct-feedback-collector'>
      {
        transition.map(({ item, key, props }) => item && (
          <animated.div style={props} key={key} id='reduct-feedback-collector-popup'>
            <p id="reduct-feedback-collector-prompt">
              Hey, can you tell us how you&apos;re feeling?
            </p>
            <div id="reduct-feedback-collector-btns">
              {
                feedbackTypes.map(([codeName, displayName]) => (
                  <button
                    type='button'
                    key={codeName}
                    className='btn btn-secondary reduct-feedback-collector-btn'
                    onClick={() => sendFeedback(codeName)}
                  >
                    {displayName}
                  </button>
                ))
              }
            </div>
          </animated.div>
        ))
      }
    </div>
  );
};
