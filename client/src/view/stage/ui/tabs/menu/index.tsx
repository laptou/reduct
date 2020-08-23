/**
 * @file The menu which appears in the top right of the game. Contains the level
 * selector as well as preferences and navigation.
 */
import '@resources/style/react/ui/menu.scss';
import React, { useState } from 'react';
import { animated, useSpring, useTransition } from 'react-spring';

import { LevelSelect, LevelInfo } from './level';
import { Preferences } from './preferences';
import { EndGameButton } from './end-game';

export const GameMenuTab: React.FC = () => {
  const [isOpen, setOpen] = useState(false);

  const innerStyle = useSpring({
    transform: isOpen ? 'translateY(30rem)' : 'translateY(0rem)',
    config: {
      mass: 1,
      tension: 180,
      friction: 14,
    },
  });

  const dismissTransition = useTransition(isOpen, null, {
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
  });

  return (
    <div id='reduct-game-menu'>
      {
        /* this element detects if the user clicks outside the dialog */
        dismissTransition.map(({ item, key, props: style }) =>
          item && <animated.div
            id='reduct-game-menu-dismiss'
            key={key}
            style={style}
            onClick={() => setOpen(false)}
          />
        )
      }
      {
        /* inner element needed b/c using transform css property causes
          position: absolute to not work as intended */
      }
      <animated.div id='reduct-game-menu-inner' style={innerStyle}>
        <div id='reduct-game-menu-scroller'>
          <EndGameButton />
          <hr />

          <Preferences />
          <hr />

          <LevelSelect />
        </div>
        <div id='reduct-game-menu-tab'>
          <LevelInfo onToggleLevelSelect={() => setOpen(!isOpen)} />
        </div>
      </animated.div>
    </div>
  );
};
