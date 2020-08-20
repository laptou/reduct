import React, {
  ReactChild, useState, useRef, useMemo, useLayoutEffect,
} from 'react';
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

enum BubbleSide {
  Auto,
  Bottom = 'bottom',
  Left = 'left',
  Top = 'top',
  Right = 'right',
}

export const Bubble: React.FC<BubbleProps> = ({
  children, type, show,
}) => {
  const bubbleRef = useRef<HTMLDivElement>(null);

  const [side, setSide] = useState(BubbleSide.Auto);

  const style = useMemo(() => {
    switch (side) {
    case BubbleSide.Auto:
      return { };
    case BubbleSide.Bottom:
      return {
        top: '100%',
        left: '50%',
        paddingTop: '1rem',
        transformOrigin: 'center top',
      };
    case BubbleSide.Right:
      return {
        top: '50%',
        left: '100%',
        paddingLeft: '1rem',
        transformOrigin: 'left center',
      };
    case BubbleSide.Top:
      return {
        left: '50%',
        bottom: '100%',
        paddingBottom: '1rem',
        transformOrigin: 'center bottom',
      };
    case BubbleSide.Left:
      return {
        top: '50%',
        right: '100%',
        paddingRight: '1rem',
        transformOrigin: 'right center',
      };
    }
  }, [side]);

  const transition = useTransition(show, null, {
    from: {
      opacity: 0,
      transform: 'scale(0)',
    },
    enter: {
      opacity: 1,
      transform: 'scale(1)',
    },
    leave: {
      opacity: 0,
      transform: 'scale(0)',
    },
  });

  // bubble is shown at the edge of its parent element, so we need to find out
  // which side we should show the bubble on to avoid being clipped
  useLayoutEffect(() => {
    if (!show) return;

    const bubbleDiv = bubbleRef.current!;
    const bubbleBounds = bubbleDiv.getBoundingClientRect();
    console.log('bubble bounds', bubbleBounds);

    const parent = bubbleDiv.parentElement!;
    const parentBounds = parent.getBoundingClientRect();
    console.log('parent bounds', parentBounds);

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

    console.log('clip element', clip);
    console.log('clip bounds', clipBounds);

    if (bubbleBounds.height < clipBounds.bottom - parentBounds.bottom)
      setSide(BubbleSide.Bottom);

    if (bubbleBounds.height < parentBounds.top - clipBounds.top)
      setSide(BubbleSide.Top);

    if (bubbleBounds.width < clipBounds.right - parentBounds.right)
      setSide(BubbleSide.Right);

    if (bubbleBounds.width < parentBounds.left - clipBounds.left)
      setSide(BubbleSide.Left);
  }, [show]);

  return transition.map(({ item, key, props }) => item && (
    <animated.div
      style={{
        ...style,
        ...props,
      }}
      key={key}
      className={`reduct-bubble reduct-bubble-${type} reduct-bubble-${side}`}
      ref={bubbleRef}
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
