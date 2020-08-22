import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';

import { createGoToSurvey } from '@/store/action/game';

enum EndGameButtonState {
  None,
  PressedDisabled,
  PressedEnabled,
}

interface EndGameButtonDispatchProps {
  startSurvey(): void;
}

const EndGameButtonImpl: React.FC<EndGameButtonDispatchProps> = (props) => {
  const { startSurvey } = props;
  const [mode, setMode] = useState(EndGameButtonState.None);

  useEffect(() => {
    if (mode === EndGameButtonState.PressedDisabled)
      setTimeout(() => {
        setMode(EndGameButtonState.PressedEnabled);
      }, 3000);

    if (mode === EndGameButtonState.PressedEnabled)
      setTimeout(() => {
        setMode(EndGameButtonState.None);
      }, 8000);
  }, [mode]);

  switch (mode) {
  case EndGameButtonState.None:
    return (
      <button
        id='reduct-level-info-quit'
        type='button'
        onClick={() => setMode(EndGameButtonState.PressedDisabled)}
        className='btn btn-default'
      >
        End game
      </button>
    );
  case EndGameButtonState.PressedDisabled:
    return (
      <button
        id='reduct-level-info-quit'
        type='button'
        className='btn btn-default'
        disabled
      >
        Please wait
      </button>
    );
  case EndGameButtonState.PressedEnabled:
    return (
      <button
        id='reduct-level-info-quit'
        type='button'
        className='btn btn-danger'
        onClick={startSurvey}
      >
        Are you sure? Click again to end the game.
      </button>
    );
  }
};

/**
 * A button that lets the player end the game early. Forces them to wait a
 * couple of seconds and then confirm in order to avoid doing this accidentally.
 */
export const EndGameButton =
  connect(null, (dispatch) => ({
    startSurvey() { dispatch(createGoToSurvey()); },
  }))(EndGameButtonImpl);
