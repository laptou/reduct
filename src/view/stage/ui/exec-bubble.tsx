import React from 'react';
import { Bubble } from './bubble';

interface ExecBubbleProps {
  executing: boolean;
}

export const ExecBubble: React.FC<ExecBubbleProps> = ({ executing }) => {
  return (
    <Bubble type='info' show={executing}>
      executing
    </Bubble>
  );
}
