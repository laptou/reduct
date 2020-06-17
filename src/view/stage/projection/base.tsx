import { GlobalState } from '@/reducer/state';
import { NodeId, ReductNode } from '@/semantics';
import { Im } from '@/util/im';
import cx from 'classnames';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { getProjectionForNode } from '.';

/**
 * Props retrieved from Redux.
 */
interface StageProjectionStoreProps { 
  /**
   * The node to display here.
   */
  node: ReductNode | null;
}

/**
 * Props provided directly.
 */
interface StageProjectionOwnProps { 
  /**
   * The ID of the node to display in this projection.
   */
  nodeId: NodeId | null;
}

type StageProjectionProps = StageProjectionOwnProps & StageProjectionStoreProps;

function onDragStart(
  event: React.DragEvent<HTMLDivElement>,
  props: StageProjectionProps
) {
  if (!props.nodeId) return;

  event.dataTransfer.setData('application/reduct-node', props.nodeId.toString());
  event.dataTransfer.dropEffect = 'move';
  
  // stop parent projections from hijacking the drag
  event.stopPropagation();
};

const StageProjectionImpl: FunctionComponent<StageProjectionProps> = 
  (props) => {
    if (!props.node) {
      return null;
    }

    const component = getProjectionForNode(props.node);

    // top level nodes (nodes w/o parents) should not be considered locked
    // TODO: don't mark top level nodes as locked
    const locked = props.node.parent ? props.node.locked : false;

    const draggable = 
      // can't drag slots
      props.node.type !== 'missing' 
      // can't drag locked nodes
      && !locked;

    return (
      <div className={cx('projection wrapper', { locked })}
        draggable={draggable} 
        onDragStart={e => onDragStart(e, props)}
      >
        {component}
      </div>
    );
  };

/**
 * StageProjection is the 'base' projection. It takes a node ID, goes to to the
 * Redux store to get the node, and then displays one of the other projection
 * types based on that node. It also handles events, states, and styles that are
 * common to all projections (for example, being dragged, or being locked).
 */
export const StageProjection = connect(
  (
    state: Im<GlobalState>, 
    ownProps: StageProjectionOwnProps
  ) => {
    if (ownProps.nodeId) {
      const node = state.program
        .get('$present')
        .nodes
        .get(ownProps.nodeId);
      return { node: node ? node.toJS() : null };
    }
    return { node: null };
  }
)(StageProjectionImpl);
