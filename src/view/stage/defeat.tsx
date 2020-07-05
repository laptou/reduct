import React from 'react';
import { connect } from 'react-redux';
import { DeepReadonly } from '@/util/helper';
import { GlobalState, GameMode } from '@/reducer/state';
import { undo as createUndo } from '@/reducer/undo';

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
    <div id='reduct-defeat'>
      <span className='defeat-message'>You&apos;re stuck.</span>

      <button type='button' onClick={() => props.undo()}>
        Undo
      </button>
    </div>
  );
}

export const DefeatOverlay = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isDefeat: store.program.$present.mode === GameMode.Defeat
  }),
  (dispatch) => ({
    undo() { dispatch(createUndo()); }
  })
)(DefeatImpl);
