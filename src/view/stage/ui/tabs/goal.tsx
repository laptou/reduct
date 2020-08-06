import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

import { StageProjection } from '../../projection/base';

import { GlobalState } from '@/store/state';
import { NodeId } from '@/semantics';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/goal.scss';
import Loader from '@/loader';

interface GoalStoreProps {
  nodeIds: ReadonlySet<NodeId>;
  levelIndex: number;
}

type GoalProps = GoalStoreProps;

const GoalImpl: FunctionComponent<GoalProps> = 
  (props) => {
    const progression = Loader.progressions['Elementary'];
    const level = progression.levels[props.levelIndex];

    return (
      <div id='reduct-goal'>
        <div id='reduct-goal-header'>
          Goal
        </div>
        <div id='reduct-goal-content'>
          {[...props.nodeIds].map(nodeId => <StageProjection nodeId={nodeId} key={nodeId} frozen />)}
        </div>
        <div id='reduct-goal-hint'>
          Hint: {level.textgoal}
        </div>
      </div>
    );
  };

export const GoalTab = connect(
  (state: DeepReadonly<GlobalState>) => ({
    nodeIds: state.game.$present.goal,
    levelIndex: state.game.$present.level,
  })
)(GoalImpl);
