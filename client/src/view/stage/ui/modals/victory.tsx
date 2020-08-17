import React from 'react';
import { connect } from 'react-redux';

import { Modal } from '../modal';

import LevelCompleteText from '@resources/graphics/titles/level-complete.svg';
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
    <Modal className='reduct-level-modal'>
      <img
        src={LevelCompleteText}
        className='reduct-level-modal-title'
      />

      <div className='reduct-level-modal-actions'>
        <button
          type='button'
          onClick={() => props.startLevel(props.nextLevel)}
          className='btn btn-primary'
        >
          Next level
        </button>
      </div>
    </Modal>
  );
};

export const VictoryOverlay = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isVictory: store.game.$present.mode === GameMode.Victory,
    nextLevel: store.game.$present.level + 1,
  }),
  (dispatch) => ({
    startLevel(index: number) { dispatch(createStartLevel(index)); },
  })
)(VictoryImpl);
