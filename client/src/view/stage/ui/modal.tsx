import '@resources/style/react/ui/modals.scss';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { animated, useSpring } from 'react-spring';

export const Modal: React.FC<React.HTMLAttributes<HTMLDivElement>> =
  (props) => {
    const [animatedStyleProps, setAnimatedStyleProps] =
      useSpring(() => ({
        opacity: 0,
      }));

    useEffect(() => {
      setAnimatedStyleProps({ opacity: 1 });
      return () => setAnimatedStyleProps({ opacity: 0 });
    });

    return createPortal(
      <animated.div
        id="reduct-modal-overlay"
        style={animatedStyleProps}
        {...props}
      />,
      document.getElementById('reduct-modal')!
    );
  };
