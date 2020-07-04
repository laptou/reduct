import React from 'react';
import { connect } from 'react-redux';
import { DeepReadonly } from '@/util/helper';
import { GlobalState, GameMode } from '@/reducer/state';

interface VictoryStoreProps {
  isVictory: boolean;
}

const VictoryImpl = (props: VictoryStoreProps) => {
  if (!props.isVictory)
    return null;

  return (
    <div id='reduct-victory'>
      <span className='victory-message'>You win!</span>

      <button type='button'>
        Next level
      </button>
    </div>
  );
}

export const Victory = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isVictory: store.program.$present.mode === GameMode.Victory
  })
)(VictoryImpl);
