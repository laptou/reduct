import React from 'react';
import { connect } from 'react-redux';
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
    <div className='reduct-banner-page'>
      <h1 id='defeat-message'>You&apos;re stuck.</h1>

      <div className='reduct-banner-actions'>
        <button type='button' onClick={() => props.undo()}>
          Undo
        </button>
      </div>
    </div>
  );
}

export const DefeatOverlay = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isDefeat: store.game.$present.mode === GameMode.Defeat
  }),
  (dispatch) => ({
    undo() { dispatch(createUndo()); }
  })
)(DefeatImpl);
