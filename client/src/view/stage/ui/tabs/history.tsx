/**
 * @file This file contains the component for the undo and redo buttons.
 */

import React from 'react';
import { connect } from 'react-redux';

import { GlobalState } from '@/store/state';
import '@resources/style/react/ui/history.scss';
import { redo as createRedo, undo as createUndo } from '@/store/reducer/undo';
import { DeepReadonly } from '@/util/helper';

interface HistoryStoreProps {
  canUndo: boolean;
  canRedo: boolean;
}

interface HistoryDispatchProps {
  undo(): void;
  redo(): void;
}

const HistoryImpl = (props: HistoryStoreProps & HistoryDispatchProps) => {
  return (
    <div id='reduct-history'>
      <button type='button' disabled={!props.canUndo} onClick={() => props.undo()} className='btn btn-default'>
        Undo
      </button>
      <button type='button' disabled={!props.canRedo} onClick={() => props.redo()} className='btn btn-default'>
        Redo
      </button>
    </div>
  );
};

export const HistoryTab = connect(
  (store: DeepReadonly<GlobalState>) => ({
    canUndo: store.game.$past.length > 0,
    canRedo: store.game.$future.length > 0,
  }),
  (dispatch) => ({
    undo() { dispatch(createUndo()); },
    redo() { dispatch(createRedo()); },
  })
)(HistoryImpl);
