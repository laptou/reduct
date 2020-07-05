import { moveNodeToSlot, createClearError } from '@/reducer/action';
import { Flat, NodeId } from '@/semantics';
import { MissingNode } from '@/semantics/defs';
import cx from 'classnames';
import React, { FunctionComponent, useState } from 'react';
import { connect } from 'react-redux';

interface MissingProjectionOwnProps {
  node: Flat<MissingNode>;
}

interface MissingProjectionDispatchProps {
  fill(id: NodeId): void;
  clearError(): void;
}

type MissingProjectionProps = 
  MissingProjectionOwnProps & 
  MissingProjectionDispatchProps;

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
  props: MissingProjectionProps,
  setHover: (hover: boolean) => void
) {
  const nodeId = parseInt(event.dataTransfer.getData('application/reduct-node'));
  if (!nodeId || isNaN(nodeId)) return;

  props.clearError();

  // stop parent projections from hijacking the drop
  event.stopPropagation();

  setHover(false);

  // fill this slot with the node that was dropped on it
  props.fill(nodeId);
}
  
export const MissingProjectionImpl: FunctionComponent<MissingProjectionProps> = 
  (props) => {
    const [hover, setHover] = useState(false);

    return (
      <div className={cx('projection slot', { hover })}
        onDragOver={e => onDragOver(e, setHover)}
        onDragLeave={e => onDragLeave(e, setHover)}
        onDrop={e => onDrop(e, props, setHover)}
      >
      </div>
    );
  };
  
export const MissingProjection = connect(
  null, 
  (dispatch, ownProps: MissingProjectionOwnProps) => ({
    fill: (id: NodeId) => dispatch(moveNodeToSlot(ownProps.node.id, id)),
    clearError: () => dispatch(createClearError())
  })
)(MissingProjectionImpl);
