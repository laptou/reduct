import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

import { StageProjection } from '../../projection/base';

import { GlobalState } from '@/store/state';
import { NodeId } from '@/semantics';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/goal.scss';
import { getLevelByIndex } from '@/loader';

interface GoalStoreProps {
  nodeIds: ReadonlySet<NodeId>;
  levelIndex: number;
}

type GoalProps = GoalStoreProps;

function getRandomAlien() {
  const alienContext = require.context('@resources/graphics/assets', false, /alien[-a-z0-9]+\.png$/);
  const alienResourceKeys = alienContext.keys();
  const index = Math.floor(Math.random() * alienResourceKeys.length);
  return alienContext(alienResourceKeys[index]).default;
}

const GoalImpl: FunctionComponent<GoalProps> =
  (props) => {
    const level = getLevelByIndex(props.levelIndex);
    const alien = getRandomAlien();

    return (
      <div id='reduct-goal'>
        <img id='reduct-goal-alien' src={alien} />
        <div id='reduct-goal-header'>
          Goal
        </div>
        <div id='reduct-goal-content'>
          {[...props.nodeIds].map(nodeId => <StageProjection nodeId={nodeId} key={nodeId} frozen />)}
        </div>
        {
          level.textgoal
            ? (
              <div id='reduct-goal-hint'>
                Hint: {level.textgoal}
              </div>
            )
            : null
        }
      </div>
    );
  };

export const GoalTab = connect(
  (state: DeepReadonly<GlobalState>) => ({
    nodeIds: state.game.$present.goal,
    levelIndex: state.game.$present.level,
  })
)(GoalImpl);
