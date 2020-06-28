import { GlobalState } from '@/reducer/state';
import { NodeId } from '@/semantics';
import { DeepReadonly, DRF } from '@/util/helper';
import cx from 'classnames';
import React, {
  FunctionComponent, useEffect, useRef, useState 
} from 'react';
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

  /**
   * The ID of the node which created this node.
   */
  sourceId: NodeId | null;
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
  props: StageProjectionProps,
  setOffset: (off: { x: number; y: number }) => void
) {
  if (!props.nodeId) return;

  event.dataTransfer.setData('application/reduct-node', props.nodeId.toString());
  event.dataTransfer.dropEffect = 'move';

  // store offset from center of node
  const {
    top, left, width, height 
  } = event.currentTarget.getBoundingClientRect();
  setOffset({ x: left + width / 2 - event.clientX, y: top + height / 2 - event.clientY });
  
  // stop parent projections from hijacking the drag
  event.stopPropagation();
}

function onDragEnd(
  event: React.DragEvent<HTMLDivElement>,
  offset: { x: number; y: number },
  setPosition: (pos: { x: number; y: number }) => void
) {
  const board = document.getElementById('reduct-board')!;
  const { top: boardTop, left: boardLeft } = board.getBoundingClientRect();

  setPosition({ x: event.clientX - boardLeft + offset.x, y: event.clientY - boardTop + offset.y });
};


const StageProjectionImpl: FunctionComponent<StageProjectionProps> = 
  (props) => {
    // offset from the center where this node was grabbed at the start of a drag
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    // position of this node on the board; has no effect if the node is not
    // directly on the board
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // run when component is re-rendered
    useEffect(() => {
      if (props.sourceId) {
        // this node was created by another node, position this node on top of
        // its source node

        const board = document.getElementById('reduct-board')!;
        const sourceProjection = document.getElementById(`projection-${props.sourceId}`);

        if (!sourceProjection) return;

        const { top: boardTop, left: boardLeft } = board.getBoundingClientRect();
        const { top, left } = sourceProjection.getBoundingClientRect();

        setPosition({ x: left - boardLeft, y: top - boardTop });
      }
    });

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
        id={`projection-${props.nodeId}`}
        className={cx('projection wrapper', { locked, draggable })}
        draggable={draggable} 
        style={{ left: position.x, top: position.y }}
        onDragStart={e => onDragStart(e, props, setOffset)}
        onDragEnd={e => onDragEnd(e, offset, setPosition)}
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

      const sourceId = node ? (state.program.$present.added.get(node.id) ?? null) : null;

      return { node, sourceId };
    }
    return { node: null, sourceId: null };
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
