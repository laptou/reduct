import React from 'react';
import { connect } from 'react-redux';
import { DeepReadonly } from '@/util/helper';
import { GlobalState, GameMode } from '@/reducer/state';
import { createStartLevel } from '@/reducer/action';

interface ErrorDisplayProps {
  resetError(): void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = (props) => {
  return (
    <div id='reduct-error'>
      <span className='error-header'>Uh oh.</span>
      <p className='error-message'>
        Reduct has crashed. We&apos;ve been notified about this issue, and will fix it ASAP.
      </p>

      <button type='button' onClick={() => props.resetError()}>
        Reset
      </button>
    </div>
  );
}

export const VictoryOverlay = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isVictory: store.program.$present.mode === GameMode.Victory,
    nextLevel: store.program.$present.level + 1
  }),
  (dispatch) => ({
    startLevel(index: number) { dispatch(createStartLevel(index)); }
  })
)(VictoryImpl);
