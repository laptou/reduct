import React from 'react';

import { Bubble } from './bubble';

import {
  AlreadyFullyBoundError, BuiltInError, CircularCallError, GameError, InvalidActionError, MissingNodeError, NotOnBoardError, RecursiveNodeError, UnknownNameError, WrongBuiltInParamsCountError, WrongTypeError,
} from '@/store/errors';

interface ErrorBubbleProps {
  error: GameError | null;

  /**
   * A dummy object that can be changed when the boundaries of the bubble need
   * to be updated.
   */
  update?: any;
}

export const ErrorBubble: React.FC<ErrorBubbleProps> = ({ error, update }) => {
  let message = '';

  if (error instanceof WrongTypeError) {
    message = `We need a ${error.expected.join(' or a ')}, but we found a ${error.actual}`;
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

  if (error instanceof AlreadyFullyBoundError) {
    message = 'This function doesn\'t need any more parameters.';
  }

  if (error instanceof WrongBuiltInParamsCountError) {
    message = `This function needs ${error.expected} parameters, but you only gave it ${error.actual}.`;
  }

  if (error instanceof InvalidActionError) {
    message = 'You can\'t do that.';
  }

  if (error instanceof RecursiveNodeError) {
    message = 'You can\'t drag a node into itself.';
  }

  if (error instanceof BuiltInError) {
    message = error.message;
  }

  return (
    <Bubble type='error' show={!!error} update={update}>
      {message}
    </Bubble>
  );
};
