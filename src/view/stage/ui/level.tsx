import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/level.scss';
import React from 'react';
import { connect } from 'react-redux';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LevelInfoStoreProps {
  level: number;
}

const LevelInfoImpl = (props: LevelInfoStoreProps) => {
  return (
    <div id='reduct-level-info'>
      <span className='level-info-level'>Level {props.level + 1}</span>
      <span className='level-info-chapter'>Chapter X</span>
    </div>
  );
}

export const LevelInfo = connect(
  (store: DeepReadonly<GlobalState>) => ({
    level: store.program.$present.level
  })
)(LevelInfoImpl);
