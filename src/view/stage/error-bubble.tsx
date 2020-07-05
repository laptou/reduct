import {
  MissingNodeError, NotOnBoardError, UnknownNameError, WrongTypeError, NodeError, CircularCallError 
} from '@/reducer/errors';
import React from 'react';

interface ErrorBubble {
  error: NodeError | null;
}

export const ErrorBubble = ({ error }: ErrorBubble) => {
  let message = null;

  if (error instanceof WrongTypeError) {
    message = `We need a ${error.expected}, but we found a ${error.actual}`;
  }

  if (error instanceof NotOnBoardError) {
    message = 'You need to put this on the board before doing anything with it.';
  }

  if (error instanceof MissingNodeError) {
    message = 'You need to fill in this slot.';
  }

  if (error instanceof UnknownNameError) {
    message = `We don't know what '${error.name}' is in this context.`;
  }

  if (error instanceof CircularCallError) {
    message = 'You can\'t call a function with itself as a parameter.';
  }

  return (
    <div className='reduct-error-bubble'>
      <svg className='reduct-error-bubble-pointer' viewBox='0 0 32 16'>
        <polygon points='16 0 0 16 32 16' />
      </svg>
      <div className='reduct-error-bubble-inner'>
        {message}
      </div>
    </div>
  );
}
