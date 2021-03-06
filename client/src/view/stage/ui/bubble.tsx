import React, {
  ReactChild, useCallback, useLayoutEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { animated, useTransition } from 'react-spring';

import { useTimer } from './util';

export interface BubbleProps {
  /**
   * True if this bubble should be displayed.
   */
  show: boolean;

  /**
   * The type of bubble this is. Currently only controls the color.
   */
  type: 'error' | 'info';

  /**
   * True if this bubble should continuously check if the parent element's
   * boundaries have changed.
   */
  update?: boolean;

  children: ReactChild;
}

enum BubbleSide {
  Auto = 'auto',
  Bottom = 'bottom',
  Left = 'left',
  Top = 'top',
  Right = 'right',
}

export const Bubble: React.FC<BubbleProps> = ({
  children, type, show, update,
}) => {
  const baseDivRef = useRef<HTMLDivElement>(null);
  const bubbleDivRef = useRef<HTMLDivElement>(null);

  const [side, setSide] = useState(BubbleSide.Auto);
  const [parentBounds, setParentBounds] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });

  const transition = useTransition(show, null, {
    from: {
      opacity: 0,
      ['--scale' as any]: 0,
    },
    enter: {
      opacity: 1,
      ['--scale' as any]: 1,
    },
    leave: {
      opacity: 0,
      ['--scale' as any]: 0,
    },
    onDestroyed(isDestroyed) {
      if (isDestroyed)
        setSide(BubbleSide.Auto);
    },
  });

  const measure = useCallback(() => {
    if (!show) return;

    const bubbleDiv = bubbleDivRef.current!;
    const bubbleBounds = bubbleDiv.getBoundingClientRect();

    // bubble is positioned at the edge of its parent, so
    // we need parent bound size
    const parent = baseDivRef.current!.parentElement!;
    const newParentBounds = parent.getBoundingClientRect();

    // travel upwards until we find an element that doesn't have
    // overflow: visible
    let clip = parent;

    while (
      getComputedStyle(clip).overflow === 'visible'
      && clip.parentElement
    ) {
      clip = clip.parentElement;
    }

    const clipBounds = clip.getBoundingClientRect();

    if (bubbleBounds.height < clipBounds.bottom - newParentBounds.bottom)
      setSide(BubbleSide.Bottom);
    else if (bubbleBounds.height < newParentBounds.top - clipBounds.top)
      setSide(BubbleSide.Top);
    else if (bubbleBounds.width < clipBounds.right - newParentBounds.right)
      setSide(BubbleSide.Right);
    else if (bubbleBounds.width < newParentBounds.left - clipBounds.left)
      setSide(BubbleSide.Left);

    setParentBounds({
      top: newParentBounds.top,
      left: newParentBounds.left,
      width: newParentBounds.width,
      height: newParentBounds.height,
    });
  }, [show]);

  useTimer(measure, 100, update ?? false);

  // bubble is shown at the edge of its parent element, so we need to find out
  // which side we should show the bubble on to avoid being clipped
  useLayoutEffect(measure, [measure]);

  return (
    <div ref={baseDivRef}>
      {createPortal(
        transition.map(({ item, key, props }) => item && (
          <div
            className='reduct-bubble-parent' style={parentBounds}
            key={key}
          >
            <animated.div
              style={props}
              className={`reduct-bubble reduct-bubble-${type} reduct-bubble-${side}`}
              ref={bubbleDivRef}
            >
              <svg className='reduct-bubble-pointer' viewBox='8 0 16 16'>
                <polygon points='16 0 0 16 32 16' />
              </svg>
              <div className='reduct-bubble-inner'>
                {children}
              </div>
            </animated.div>
          </div>
        )),
        document.getElementById('reduct-bubbles')!
      )}
    </div>
  );
};
