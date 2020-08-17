import React from 'react';
import { connect } from 'react-redux';

import { Modal } from '../modal';

import LevelIncompleteText from '@resources/graphics/titles/level-incomplete.svg';
import { DeepReadonly } from '@/util/helper';
import { GlobalState, GameMode } from '@/store/state';
import { undo as createUndo } from '@/store/reducer/undo';

interface DefeatStoreProps {
  isDefeat: boolean;
}

interface DefeatDispatchProps {
  undo(): void;
}

const DefeatImpl = (props: DefeatStoreProps & DefeatDispatchProps) => {
  if (!props.isDefeat)
    return null;

  return (
    <Modal>
      <div className='reduct-level-modal'>
        <img
          src={LevelIncompleteText}
          className='reduct-level-modal-title'
        />

        <p className='reduct-level-modal-text'>
          There are no moves from here that would complete the level.
          Let&apos;s try something else.
        </p>

        <div className='reduct-level-modal-actions'>
          <button type='button' onClick={() => props.undo()}>
            Undo
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const DefeatOverlay = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isDefeat: store.game.$present.mode === GameMode.Defeat,
  }),
  (dispatch) => ({
    undo() { dispatch(createUndo()); },
  })
)(DefeatImpl);
