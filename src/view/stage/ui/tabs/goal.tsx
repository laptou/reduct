import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

import { StageProjection } from '../../projection/base';

import { GlobalState } from '@/store/state';
import { NodeId } from '@/semantics';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/goal.scss';

interface GoalStoreProps {
  nodeIds: DeepReadonly<Set<NodeId>>;
}

type GoalProps = GoalStoreProps;

const GoalImpl: FunctionComponent<GoalProps> = 
  (props) => {
    return (
      <div id='reduct-goal'>
        <div id='reduct-goal-text'>
          GOAL:
        </div>
        <div id='reduct-goal-items'>
          {[...props.nodeIds].map(nodeId => <StageProjection nodeId={nodeId} key={nodeId} frozen />)}
        </div>
      </div>
    );
  };

export const Goal = connect(
  (state: DeepReadonly<GlobalState>) => ({
    nodeIds: state.game.$present.goal,
  })
)(GoalImpl);
