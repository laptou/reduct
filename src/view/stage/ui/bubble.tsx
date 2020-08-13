import React, { ReactChild, useState } from 'react';
import { animated, useTransition } from 'react-spring';

interface BubbleProps {
  /**
   * True if this bubble should be displayed.
   */
  show: boolean;

  /**
   * The type of bubble this is. Currently only controls the color.
   */
  type: 'error';

  children: ReactChild;
}

export const Bubble: React.FC<BubbleProps> = ({
  children, type, show,
}) => {
  const [side, setSide] = useState('bottom');

  let style;
  let translate;

  switch (side) {
  case 'bottom':
    style = {
      top: '100%',
      left: '50%',
      paddingTop: '1rem',
      transformOrigin: 'center top',
    };
    translate = 'translate(-50%, 0) ';
    break;
  }

  const transition = useTransition(show, null, {
    from: {
      opacity: 0,
      transform: translate + 'scale(0)',
      ...style,
    },
    enter: {
      opacity: 1,
      transform: translate + 'scale(1)',
      ...style,
    },
    leave: {
      opacity: 0,
      transform: translate + 'scale(0)',
      ...style,
    },
  });

  return transition.map(({ item, key, props }) => item && (
    <animated.div
      style={props}
      key={key}
      className={`reduct-bubble reduct-bubble-${type}`}
    >
      <svg className='reduct-bubble-pointer' viewBox='0 0 32 16'>
        <polygon points='16 0 0 16 32 16' />
      </svg>
      <div className='reduct-bubble-inner'>
        {children}
      </div>
    </animated.div>
  ));
};
