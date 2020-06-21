import { LambdaNode, LambdaArgNode, LambdaVarNode } from '@/semantics/defs';
import '@resources/style/react/projection/lambda.scss';
import React, { FunctionComponent, useState } from 'react';
import { connect } from 'react-redux';
import { StageProjection } from './base';
import { Flat, NodeId } from '@/semantics';
import { createEvalLambda } from '@/reducer/action';

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
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface LambdaProjectionDispatchProps {
  evalLambda(paramNodeId: NodeId): void;
}

type LambdaProjectionProps = 
  LambdaProjectionOwnProps & 
  LambdaProjectionDispatchProps;

function onDragOver(
  event: React.DragEvent<HTMLDivElement>, 
  setHover: (hover: boolean) => void
) {
  if (!event.dataTransfer.types.includes('application/reduct-node')) return;
  event.preventDefault();
  
  setHover(true);
}
  
function onDragLeave(
  event: React.DragEvent<HTMLDivElement>,
  setHover: (hover: boolean) => void
) {
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
  const nodeId = parseInt(event.dataTransfer.getData('application/reduct-node'));
  if (!nodeId || isNaN(nodeId)) return;
  
  event.preventDefault();
  
  // stop parent projections from hijacking the drop
  event.stopPropagation();
  
  setHover(false);
  
  // fill this slot with the node that was dropped on it
  props.evalLambda(nodeId);
}

export const LambdaProjectionImpl: FunctionComponent<LambdaProjectionProps> = 
  (props) => {
    const [hover, setHover] = useState(false);

    return (
      <div className='projection lambda'>
        <div className='arg' 
          onDragOver={e => onDragOver(e, setHover)}
          onDragLeave={e => onDragLeave(e, setHover)}
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
