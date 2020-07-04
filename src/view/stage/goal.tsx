import { GlobalState } from '@/reducer/state';
import { NodeId } from '@/semantics';
import { DeepReadonly } from '@/util/helper';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { StageProjection } from './projection/base';

interface GoalStoreProps {
  nodeIds: DeepReadonly<Set<NodeId>>;
}

type GoalProps = GoalStoreProps;

const GoalImpl: FunctionComponent<GoalProps> = 
  (props) => {
    return (
      <div id='reduct-goal'>
        {[...props.nodeIds].map(nodeId => <StageProjection nodeId={nodeId} key={nodeId} frozen />)}
      </div>
    );
  };

export const Goal = connect(
  (state: DeepReadonly<GlobalState>) => ({
    nodeIds: state.program.$present.goal
  })
)(GoalImpl);
