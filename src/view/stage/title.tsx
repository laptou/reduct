import React from 'react';
import { connect } from 'react-redux';
import { DeepReadonly } from '@/util/helper';
import { GlobalState, GameMode } from '@/reducer/state';
import { createStartLevel } from '@/reducer/action';

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
    <div id='reduct-title'>
      <span className='title-message'>Reduct</span>

      <button type='button' onClick={() => props.startLevel()}>
        Start
      </button>
    </div>
  );
}

export const Title = connect(
  (store: DeepReadonly<GlobalState>) => ({
    isTitle: store.program.$present.mode === GameMode.Title
  }),
  (dispatch) => ({
    startLevel() { dispatch(createStartLevel(41)); }
  })
)(TitleImpl);
