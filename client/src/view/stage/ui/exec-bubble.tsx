import React from 'react';

import { Bubble } from './bubble';

interface ExecBubbleProps {
  /**
   * True if the node is currently executing.
   */
  executing: boolean;

  /**
   * Called when the user stops the execution.
   */
  onStop: () => void;

  /**
   * Called when the user fast-forwards the execution.
   */
  onSkip: () => void;
}

export const ExecBubble: React.FC<ExecBubbleProps> = ({ executing, onStop, onSkip }) => {
  return (
    <Bubble type='info' show={executing}>
      <button type='button' className='btn-flat' onClick={e => { e.stopPropagation(); onStop(); }}>
        Stop
      </button>
      <button type='button' className='btn-flat' onClick={e => { e.stopPropagation(); onSkip(); }}>
        Skip
      </button>
    </Bubble>
  );
};
