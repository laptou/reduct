import React from 'react';
import { connect } from 'react-redux';
import { DeepReadonly } from '@/util/helper';
import { GlobalState, GameMode } from '@/store/state';
import { createStartLevel } from '@/store/action/game';

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
    <div className='reduct-banner-page'>
      <h1 id='victory-message'>You win!</h1>
      
      <div className='reduct-banner-actions'>
        <button type='button' onClick={() => props.startLevel(props.nextLevel)}>
          Next level
        </button>
      </div>
    </div>
  );
}

export const VictoryOverlay = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isVictory: store.game.$present.mode === GameMode.Victory,
    nextLevel: store.game.$present.level + 1
  }),
  (dispatch) => ({
    startLevel(index: number) { dispatch(createStartLevel(index)); }
  })
)(VictoryImpl);
