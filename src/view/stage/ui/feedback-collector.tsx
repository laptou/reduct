import React, { useState, useEffect } from 'react';
import { useTransition, animated, config } from 'react-spring';

import SatisfiedFace from '@resources/icon/sentiment_satisfied-24px.svg';
import NeutralFace from '@resources/icon/sentiment_neutral-24px.svg';
import DissatisfiedFace from '@resources/icon/sentiment_dissatisfied-24px.svg';
import '@resources/style/react/ui/feedback.scss';

// interval at which the feedback collector appears in ms
const FEEDBACK_COLLECTOR_INTERVAL = 15 * 60 * 1000;

export const FeedbackCollectorPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

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

  return (
    <div id='reduct-feedback-collector'>
      {
        transition.map(({ item, key, props }) => item && (
          <animated.div style={props} key={key} id='reduct-feedback-collector-popup'>
            <p id="reduct-feedback-collector-prompt">
              Hey, can you tell us how you&apos;re feeling?
            </p>
            <button
              type='button'
              className='btn btn-flat reduct-feedback-collector-button'
              onClick={() => setIsVisible(false)}
            >
              <img src={SatisfiedFace} />
            </button>
            <button
              type='button'
              className='btn btn-flat reduct-feedback-collector-button'
              onClick={() => setIsVisible(false)}
            >
              <img src={NeutralFace} />
            </button>
            <button
              type='button'
              className='btn btn-flat reduct-feedback-collector-button'
              onClick={() => setIsVisible(false)}
            >
              <img src={DissatisfiedFace} />
            </button>
          </animated.div>
        ))
      }
    </div>
  );
};
