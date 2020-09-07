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

  /**
   * A dummy object that can be changed when the boundaries of the bubble need
   * to be updated.
   */
  update?: any;
}

export const ExecBubble: React.FC<ExecBubbleProps> = ({
  executing, onStop, onSkip, update,
}) => {
  return (
    <Bubble type='info' show={executing} update={update}>
      <button type='button' className='btn-flat' onClick={e => { e.stopPropagation(); onStop(); }}>
        Stop
      </button>
      <button type='button' className='btn-flat' onClick={e => { e.stopPropagation(); onSkip(); }}>
        Skip
      </button>
    </Bubble>
  );
};
