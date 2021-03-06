import cx from 'classnames';
import { connect } from 'react-redux';
import React, { FunctionComponent, useState } from 'react';

import { StageProjection } from './base';

import { LambdaNode, LambdaArgNode, LambdaVarNode } from '@/semantics/defs';
import '@resources/style/react/projection/lambda.scss';
import { Flat, NodeId } from '@/semantics';
import { createCall } from '@/store/action/game';


interface LambdaArgProjectionOwnProps {
  node: Flat<LambdaArgNode>;
}

export const LambdaArgProjection: FunctionComponent<LambdaArgProjectionOwnProps> =
  (props) => {
    const { name, value } = props.node.fields;

    return (
      <div className='projection lambda-arg'>
        {name}

        {
          value
            ? (
              <div className='lambda-arg-binding'>
                : <StageProjection nodeId={value} />
              </div>
            )
            : null
        }
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

interface LambdaProjectionDispatchProps {
  call(paramNodeId: NodeId): void;
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
  setHover: (hover: boolean) => void
) {
  // if this is a bubbled event, ignore
  if (event.currentTarget !== event.target)
    return;

  event.preventDefault();
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
  props.call(droppedNodeId);
}

export const LambdaProjectionImpl: FunctionComponent<LambdaProjectionProps> =
  (props) => {
    const [hover, setHover] = useState(false);

    return (
      <div className='projection lambda'>
        <div className='lambda-body'>
          <StageProjection nodeId={props.node.subexpressions.body} />
        </div>
        <span className='lambda-arrow'>
          =&gt;
        </span>
        <div
          className={cx('lambda-args', { hover })}
          onDragOver={e => onDragOver(e, props, setHover)}
          onDragLeave={e => onDragLeave(e, setHover)}
          onDrop={e => onDrop(e, props, setHover)}
        >
          <div className='lambda-args-inner'>
            <StageProjection nodeId={props.node.subexpressions.arg} />
          </div>
        </div>
      </div>
    );
  };

export const LambdaProjection = connect(
  null,
  (dispatch, ownProps: LambdaProjectionOwnProps) => ({
    call(paramNodeId: NodeId) {
      dispatch(createCall(ownProps.node.id, paramNodeId));
    },
  })
)(LambdaProjectionImpl);
