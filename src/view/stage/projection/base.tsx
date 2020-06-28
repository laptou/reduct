import { GlobalState } from '@/reducer/state';
import { NodeId } from '@/semantics';
import { DeepReadonly, DRF } from '@/util/helper';
import cx from 'classnames';
import React, { FunctionComponent, useEffect } from 'react';
import { connect } from 'react-redux';
import { getProjectionForNode } from '.';
import { createCleanup } from '@/reducer/action';

/**
 * Props retrieved from Redux.
 */
interface StageProjectionStoreProps { 
  /**
   * The node to display here.
   */
  node: DRF | null;
}

/**
 * Methods that dispatch Redux actions.
 */
interface StageProjectionDispatchProps { 
  /**
   * If this node was scheduled for deletion by a previous action,
   * remove it from the node map.
   */
  cleanup(): void;
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

type StageProjectionProps = 
  StageProjectionOwnProps & 
  StageProjectionDispatchProps &
  StageProjectionStoreProps;

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
    // run when this component is unmounted
    useEffect(() => () => {
      props.cleanup();
    }, []);

    if (!props.node) {
      return null;
    }

    // top level nodes (nodes w/o parents) should not be considered locked
    // TODO: don't mark top level nodes as locked
    const locked = props.node.parent ? props.node.locked : false;

    const draggable = 
      // can't drag slots
      props.node.type !== 'missing' 
      // can't drag locked nodes
      && !locked;

    return (
      <div 
        id={`projection-${props.node.id}`}
        data-projection-node-id={props.node.id}
        className={cx('projection wrapper', { locked, draggable })}
        draggable={draggable} 
        onDragStart={e => onDragStart(e, props)}
      >
        {getProjectionForNode(props.node)}
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
    state: DeepReadonly<GlobalState>, 
    ownProps: StageProjectionOwnProps
  ) => {
    if (ownProps.nodeId) {
      const node = state.program
        .$present
        .nodes
        .get(ownProps.nodeId) ?? null;
      return { node };
    }
    return { node: null };
  },
  (
    dispatch,
    ownProps
  ) => {
    return { 
      cleanup() { 
        if (ownProps.nodeId) {
          dispatch(createCleanup(ownProps.nodeId)); 
        }
      } 
    }
  }
)(StageProjectionImpl);
