import '@resources/style/react/ui/modals.scss';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { animated, useSpring } from 'react-spring';

export const Modal: React.FC<React.HTMLAttributes<HTMLDivElement>> =
  (props) => {
    const animatedStyleProps =
      useSpring({
        from: {
          opacity: 0,
        },
        opacity: 1,
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
