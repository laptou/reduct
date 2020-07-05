import React from 'react';
import { connect } from 'react-redux';
import { DeepReadonly } from '@/util/helper';
import { GlobalState, GameMode } from '@/store/state';
import { createStartLevel } from '@/store/action';

interface TitleStoreProps {
  isTitle: boolean;
}

interface TitleDispatchProps {
  startLevel(): void;
}

const TitleImpl = (props: TitleStoreProps & TitleDispatchProps) => {
  if (!props.isTitle)
    return null;

  return (
    <div className='reduct-banner-page'>
      <h1 id='title-message'>Reduct</h1>

      <div className='reduct-banner-actions'>
        <button type='button' onClick={() => props.startLevel()}>
          Start
        </button>
      </div>
    </div>
  );
}

export const Title = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isTitle: store.program.$present.mode === GameMode.Title
  }),
  (dispatch) => ({
    startLevel() { dispatch(createStartLevel(0)); }
  })
)(TitleImpl);
