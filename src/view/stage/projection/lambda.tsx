import { LambdaNode, LambdaArgNode, LambdaVarNode } from '@/semantics/defs';
import '@resources/style/react/projection/lambda.scss';
import React, { FunctionComponent, useState } from 'react';
import { connect } from 'react-redux';
import { StageProjection } from './base';
import { Flat, NodeId } from '@/semantics';
import { createEvalLambda } from '@/reducer/action';
import cx from 'classnames';

interface LambdaArgProjectionOwnProps {
  node: Flat<LambdaArgNode>;
}

export const LambdaArgProjection: FunctionComponent<LambdaArgProjectionOwnProps> = 
  (props) => {
    return (
      <div className='projection lambda-arg'>
        {props.node.fields.name}
      </div>
    );
  };

interface LambdaVarProjectionOwnProps {
  node: Flat<LambdaVarNode>;
}

export const LambdaVarProjection: FunctionComponent<LambdaVarProjectionOwnProps> = 
  (props) => {
    return (
      <div className='projection lambda-var'>
        {props.node.fields.name}
      </div>
    );
  };

interface LambdaProjectionOwnProps {
  node: Flat<LambdaNode>;
  setError: (err: Error) => void;
}

interface LambdaProjectionDispatchProps {
  evalLambda(paramNodeId: NodeId): void;
}

type LambdaProjectionProps = 
  LambdaProjectionOwnProps & 
  LambdaProjectionDispatchProps;

function onDragOver(
  event: React.DragEvent<HTMLDivElement>, 
  props: LambdaProjectionProps,
  setHover: (hover: boolean) => void
) {
  // you can't drop a parameter on a locked node
  if (props.node.locked && props.node.parent)
    return;

  if (!event.dataTransfer.types.includes('application/reduct-node')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  
  setHover(true);
}
  
function onDragLeave(
  event: React.DragEvent<HTMLDivElement>,
  props: LambdaProjectionProps,
  setHover: (hover: boolean) => void
) {
  // you can't drop a parameter on a locked node
  if (props.node.locked && props.node.parent)
    return;

  event.preventDefault();
  
  // TODO: add validation on whether the node being dragged can be dropped in
  // this slot
  setHover(false);
}
  
function onDrop(
  event: React.DragEvent<HTMLDivElement>,
  props: LambdaProjectionProps,
  setHover: (hover: boolean) => void
) {
  // you can't drop a parameter on a locked node
  if (props.node.locked && props.node.parent)
    return;

  const droppedNodeId = parseInt(event.dataTransfer.getData('application/reduct-node'));
  if (!droppedNodeId || isNaN(droppedNodeId)) return;
  
  event.preventDefault();
  
  // stop parent projections from hijacking the drop
  event.stopPropagation();
  
  setHover(false);
  
  // fill this slot with the node that was dropped on it
  props.evalLambda(droppedNodeId);
}

export const LambdaProjectionImpl: FunctionComponent<LambdaProjectionProps> = 
  (props) => {
    const [hover, setHover] = useState(false);

    return (
      <div className={cx('projection lambda', { hover })}>
        <div className='arg' 
          onDragOver={e => onDragOver(e, props, setHover)}
          onDragLeave={e => onDragLeave(e, props, setHover)}
          onDrop={e => onDrop(e, props, setHover)}
        >
          <StageProjection nodeId={props.node.subexpressions.arg} />
        </div>
        <span className='arrow'>
          =&gt;
        </span>
        <div className='body'>
          <StageProjection nodeId={props.node.subexpressions.body} />
        </div>
      </div>
    );
  };

export const LambdaProjection = connect(
  null, 
  (dispatch, ownProps: LambdaProjectionOwnProps) => ({
    evalLambda(paramNodeId: NodeId) {
      dispatch(createEvalLambda(paramNodeId, ownProps.node.id))
    }
  })
)(LambdaProjectionImpl);
