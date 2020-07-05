import React from 'react';
import { connect } from 'react-redux';
import { DeepReadonly } from '@/util/helper';
import { GlobalState, GameMode } from '@/reducer/state';
import { createStartLevel } from '@/reducer/action';

interface VictoryStoreProps {
  isVictory: boolean;
  nextLevel: number;
}

interface VictoryDispatchProps {
  startLevel(index: number): void;
}

const VictoryImpl = (props: VictoryStoreProps & VictoryDispatchProps) => {
  if (!props.isVictory)
    return null;

  return (
    <div id='reduct-victory'>
      <span className='victory-message'>You win!</span>

      <button type='button' onClick={() => props.startLevel(props.nextLevel)}>
        Next level
      </button>
    </div>
  );
}

export const Victory = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isVictory: store.program.$present.mode === GameMode.Victory,
    nextLevel: store.program.$present.level + 1
  }),
  (dispatch) => ({
    startLevel(index: number) { dispatch(createStartLevel(index)); }
  })
)(VictoryImpl);
