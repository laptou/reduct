import { ConditionalNode } from '@/semantics/defs';
import '@resources/style/react/projection/conditional.scss';
import React, { FunctionComponent } from 'react';
import { StageProjection } from './base';
import { Flat } from '@/semantics';
import { connect } from 'react-redux';
import { createEvalConditional } from '@/reducer/action';

interface ConditionalProjectionDispatchProps {
  eval(): void;
}

interface ConditionalProjectionOwnProps {
  node: Flat<ConditionalNode>;
}

type ConditionalProjectionProps =
  ConditionalProjectionOwnProps &
  ConditionalProjectionDispatchProps;

function onClick(
  event: React.MouseEvent<HTMLDivElement>,
  props: ConditionalProjectionProps
) {
  // cannot evaluate locked nodes
  if (props.node.locked && props.node.parent)
    return;

  // stop parent projections from hijacking the click
  event.stopPropagation();

  props.eval();
};

const ConditionalProjectionImpl: FunctionComponent<ConditionalProjectionProps> = 
  (props) => {
    return (
      <div className='projection conditional'>
        <div className='if'>
          <span>if</span>
          <StageProjection nodeId={props.node.subexpressions.condition} />
        </div>
        <div className='positive'>
          <StageProjection nodeId={props.node.subexpressions.positive} />
        </div>
        <div className='else'>
          <span>else</span>
        </div>
        <div className='negative'>
          <StageProjection nodeId={props.node.subexpressions.negative} />
        </div>
      </div>
    )
  };
  
export const ConditionalProjection = 
  connect(
    null, 
    (dispatch, ownProps: ConditionalProjectionOwnProps) => {
      return {
        eval() { dispatch(createEvalConditional(ownProps.node.id)); }
      }
    }
  )(ConditionalProjectionImpl);
