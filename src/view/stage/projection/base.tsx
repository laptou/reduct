import { createCleanup, createStep } from '@/reducer/action';
import { GlobalState } from '@/reducer/state';
import { NodeId } from '@/semantics';
import { getKindForNode, NodeKind } from '@/semantics/util';
import { DeepReadonly, DRF } from '@/util/helper';
import cx from 'classnames';
import React, { FunctionComponent, useEffect } from 'react';
import { connect } from 'react-redux';
import { getProjectionForNode } from '.';

/**
 * Props retrieved from Redux.
 */
interface StageProjectionStoreProps { 
  /**
   * The node to display here.
   */
  node: DRF | null;

  /**
   * The kind of node that `node` is.
   */
  kind: NodeKind | null;
}

/**
 * Methods that dispatch Redux actions.
 */
interface StageProjectionDispatchProps { 
  /**
   * Steps this node forward. See StepAction for more info.
   */
  step(): void;

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

  position?: { x: number; y: number };
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

  // store offset from top left of node
  const {
    top, left, width, height 
  } = event.currentTarget.getBoundingClientRect();
  const offset = { x: left - event.clientX + width / 2, y: top  - event.clientY + height / 2 };
  
  event.dataTransfer.setData('application/reduct-node-offset', JSON.stringify(offset));

  // stop parent projections from hijacking the drag
  event.stopPropagation();
}

function onClick(
  event: React.MouseEvent<HTMLDivElement>,
  props: StageProjectionProps,
) {
  if (props.kind !== 'expression') return; 

  props.step();
  event.stopPropagation();
}

const StageProjectionImpl: FunctionComponent<StageProjectionProps> = 
  (props) => {
    // run when this component is unmounted
    useEffect(() => () => props.cleanup(), []);

    if (!props.node) {
      return null;
    }

    const { position, node, kind } = props;

    // top level nodes (nodes w/o parents) should not be considered locked
    // TODO: don't mark top level nodes as locked
    const locked = node.parent ? node.locked : false;

    const draggable = 
      // can't drag slots
      node.type !== 'missing' 
      // can't drag locked nodes
      && !locked;

    const steppable = kind === 'expression';

    return (
      <div 
        id={`projection-${props.nodeId}`}
        className={cx('projection wrapper', { locked, draggable, steppable })}
        draggable={draggable}
        data-node-id={props.nodeId}
        style={{ left: position?.x, top: position?.y }}
        onDragStart={e => onDragStart(e, props)}
        onClick={e => onClick(e, props)}
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
  (state: DeepReadonly<GlobalState>, ownProps: StageProjectionOwnProps) => {
    const presentState = state.program.$present;

    if (ownProps.nodeId) {
      const node = presentState.nodes.get(ownProps.nodeId) ?? null;

      if (!node)
        return { node: null, kind: null, sourceId: null };

      const kind = getKindForNode(node, presentState.nodes);

      return { node, kind };
    }
    
    return { node: null, kind: null };
  },
  (dispatch, ownProps) => ({ 
    cleanup() { 
      if (ownProps.nodeId) {
        dispatch(createCleanup(ownProps.nodeId)); 
      }
    },
    step() { 
      if (ownProps.nodeId) {
        dispatch(createStep(ownProps.nodeId)); 
      }
    } 
  })
)(StageProjectionImpl);
