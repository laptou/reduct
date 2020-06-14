import { fillHole } from '@/reducer/action';
import { NodeId, ReductNode } from '@/semantics';
import cx from 'classnames';
import React, { FunctionComponent, useState } from 'react';
import { connect } from 'react-redux';

interface MissingElementOwnProps {
  node: ReductNode;
}

interface MissingElementDispatchProps {
  fill(id: NodeId): void;
}

type MissingElementProps = 
  MissingElementOwnProps & 
  MissingElementDispatchProps;

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
  props: MissingElementProps,
  setHover: (hover: boolean) => void
) {
  const nodeId = parseInt(event.dataTransfer.getData('application/reduct-node'));
  if (!nodeId || isNaN(nodeId)) return;

  event.preventDefault();

  setHover(false);

  // fill this slot with the node that was dropped on it
  props.fill(nodeId);
}
  
export const MissingElementImpl: FunctionComponent<MissingElementProps> = 
  (props) => {
    const [hover, setHover] = useState(false);

    return (
      <div className={cx('element slot', { hover })}
        onDragOver={e => onDragOver(e, setHover)}
        onDragLeave={e => onDragLeave(e, setHover)}
        onDrop={e => onDrop(e, props, setHover)}
      >
      </div>
    );
  };
  
export const MissingElement = connect(
  null, 
  (dispatch, ownProps: MissingElementOwnProps) => ({
    fill: (id: NodeId) => dispatch(fillHole(ownProps.node.id, id))
  })
)(MissingElementImpl);
