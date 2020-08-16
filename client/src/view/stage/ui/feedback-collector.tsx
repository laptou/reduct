import '@resources/style/react/ui/feedback.scss';
import React, {
  useCallback, useEffect, useState, useRef,
} from 'react';
import { animated, config, useTransition } from 'react-spring';

import { log } from '@/logging/logger';

// interval at which the feedback collector appears in ms
const FEEDBACK_COLLECTOR_INTERVAL = 1 * 1000;

export const FeedbackCollectorPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const sendFeedback = useCallback((affect: string) => {
    log('user:feedback', { affect });
    setIsVisible(false);
    setIsExpanded(false);
  }, [setIsVisible]);

  useEffect(() => {
    if (!isVisible) {
      const timerHandle = setTimeout(
        () => {
          setIsVisible(true);
        },
        FEEDBACK_COLLECTOR_INTERVAL
      );

      return () => clearInterval(timerHandle);
    }
  }, [isVisible]);

  const buttonContainerDiv = useRef<HTMLDivElement>(null);

  const dialogTransition = useTransition(isVisible, null, {
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

  const hintTransition = useTransition(!isExpanded, null, {
    from: { opacity: 1 },
    leave: { opacity: 0 },
  });

  const buttonsTransition = useTransition(isExpanded, null, {
    from: {
      height: 0,
      opacity: 0,
    },
    enter(isExpanded) {
      return (async (next: (props: any) => Promise<void>) => {
        // wait for div to actually be created
        await next({});

        // measure element and do the actual animation
        const height = buttonContainerDiv.current?.scrollHeight ?? 0;
        await next({
          height: isExpanded ? height : 0,
          opacity: 1,
        });

        // cast to any b/c typedefs don't support this
      }) as any;
    },
    leave: {
      height: 0,
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

      {dialogTransition.map(({ item, key, props }) => item && (
        <animated.div
          id='reduct-feedback-collector-popup'
          style={props} key={key}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          <p id="reduct-feedback-collector-prompt">
            Hey, can you tell us how you&apos;re feeling?
          </p>

          {hintTransition.map(({ item, key, props }) => item && (
            <animated.span
              id="reduct-feedback-collector-hint"
              style={props} key={key}
            >
              Mouse over this popup
            </animated.span>
          ))}

          {buttonsTransition.map(({ item, key, props }) => item && (
            <animated.div
              id="reduct-feedback-collector-content"
              style={props} key={key}
              ref={buttonContainerDiv}
            >
              <div id="reduct-feedback-collector-btns" >
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
          ))}

        </animated.div>
      ))}

    </div>
  );
};
