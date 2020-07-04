import { GlobalState } from '@/reducer/state';
import { DeepReadonly } from '@/util/helper';
import React from 'react';
import { connect } from 'react-redux';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LevelInfoStoreProps {
  // TODO
}

const LevelInfoImpl = (props: LevelInfoStoreProps) => {
  return (
    <div id='reduct-level-info'>
      <span className='level-info-level'>Level X</span>
      <span className='level-info-chapter'>Chapter X</span>
    </div>
  );
}

export const LevelInfo = connect(
  (store: DeepReadonly<GlobalState>) => ({
    // TODO
  })
)(LevelInfoImpl);
