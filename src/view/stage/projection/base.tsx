import cx from 'classnames';
import React, { FunctionComponent, useEffect, useState } from 'react';
import { connect } from 'react-redux';

import { ErrorBubble } from '../ui/error-bubble';
import { ExecBubble } from '../ui/exec-bubble';

import { getProjectionForNode } from '.';

import { NodeId } from '@/semantics';
import { getKindForNode, NodeKind } from '@/semantics/util';
import {
  createCleanup, createClearError, createExecute, createRaise, createStop, 
} from '@/store/action/game';
import { GameError } from '@/store/errors';
import { GlobalState } from '@/store/state';
import { DeepReadonly, DRF } from '@/util/helper';
import { isAncestorOf } from '@/util/nodes';
import Audio from '@/resource/audio';

/**
 * Props retrieved from Redux.
 */
interface StageProjectionStoreProps { 
  /**
   * The node to display here.
   */
  node: DRF | null;

  /**
   * The current error state.
   */
  error: GameError | null;

  /**
   * The kind of node that `node` is.
   */
  kind: NodeKind | null;

  /**
   * True if this node is currently executing (stepping without user
   * intervention).
   */
  executing: boolean;

  /**
   * True if this node is executing and all deleted children of this node have
   * been cleaned up (i.e., their animations have finished, they have been
   * eliminated from the node tree, and their React components have been
   * unmounted).
   */
  settled: boolean;
}

/**
 * Methods that dispatch Redux actions.
 */
interface StageProjectionDispatchProps { 
  /**
   * Executes this node. See ExecuteAction for more info.
   */
  exec(): void;

  /**
   * Stops executing this node. See StopAction for more info.
   */
  stopExec(): void;

  /**
   * Clears any errors currently held by the store.
   */
  clearErrorAndRaise(): void;

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

  /**
   * If true, this node will not respond to user input. Use for nodes such as
   * those in the goal area that should not be interactive.
   */
  frozen?: boolean;
}

type StageProjectionProps = 
  StageProjectionOwnProps & 
  StageProjectionDispatchProps &
  StageProjectionStoreProps;

function onDragStart(
  event: React.DragEvent<HTMLDivElement>,
  props: StageProjectionProps
) {
  props.clearErrorAndRaise();
  
  if (!props.nodeId) return;
  if (props.frozen) return;

  event.dataTransfer.setData('application/reduct-node', props.nodeId.toString());
  event.dataTransfer.dropEffect = 'move';
  

  // get offset from top left of node
  const {
    top, left, width, height, 
  } = event.currentTarget.getBoundingClientRect();
  const offset = {
    x: event.clientX - left,
    y: event.clientY - top, 
  };

  // set drag image position to get rid of weird bug in Firefox where drag image
  // is position incorrectly
  event.dataTransfer.setDragImage(event.currentTarget, offset.x, offset.y);

  // get offset from center, since nodes are positioned by their center
  const offsetCenter = {
    x: offset.x - width / 2,
    y: offset.y - height / 2, 
  };
  event.dataTransfer.setData('application/reduct-node-offset', JSON.stringify(offsetCenter));

  // stop parent projections from hijacking the drag
  event.stopPropagation();
}

function onClick(
  event: React.MouseEvent<HTMLDivElement>,
  props: StageProjectionProps,
) {
  props.clearErrorAndRaise();

  if (props.kind !== 'expression') return; 
  if (props.node && props.node.parent && props.node.locked) return; 
  if (props.frozen) return;

  props.exec();
  Audio.play('371270__mafon2__water-drip-2');

  event.stopPropagation();
}

const StageProjectionImpl: FunctionComponent<StageProjectionProps> = 
  (props) => {
    const {
      node, 
      kind, 
      frozen, 
      error, 
      settled, 
      executing, 
      cleanup, 
      exec,
      stopExec,
    } = props;

    // whether execution is being fast-forwarded or not
    const [isFast, setFast] = useState(false);

    useEffect(() => {
      if (settled && executing) {
        const timer = setTimeout(exec, isFast ? 500 : 1000);
        return () => clearTimeout(timer);
      }
    }, [
      settled, executing, exec, isFast,
    ]);

    // run when this component is unmounted
    useEffect(() => () => cleanup(), [cleanup]);

    if (!node) {
      return 'warning: missing node';
    }

    // top level nodes (nodes w/o parents) should not be considered locked
    // TODO: don't mark top level nodes as locked
    const locked = node.parent ? node.locked : false;

    const draggable = 
      // can't drag slots
      node.type !== 'missing' 
      // can't drag locked nodes
      && !locked
      && !frozen;

    const steppable = kind === 'expression';

    return (
      <div 
        id={`projection-${props.nodeId}`}
        className={cx('projection wrapper', {
          locked,
          draggable,
          steppable,
          frozen, 
        })}
        draggable={draggable}
        data-node-id={props.nodeId}
        onDragStart={e => onDragStart(e, props)}
        onClick={e => onClick(e, props)}
      >
        {getProjectionForNode(props.node)}
        <ErrorBubble error={error} />
        <ExecBubble executing={executing} onStop={stopExec} onSkip={() => setFast(true)} />
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
    const presentState = state.game.$present;

    if (ownProps.nodeId) {
      const node = presentState.nodes.get(ownProps.nodeId) ?? null;
      const error = state.game.$error?.target === ownProps.nodeId ? state.game.$error : null;
      const executing = presentState.executing.has(ownProps.nodeId);
      let settled;

      // if we are executing, settled is true iff there are no descendant nodes
      // that are waiting to be cleaned up
      if (executing) {
        settled = true;

        for (const [id, isCleanedUp] of presentState.removed) {
          if (!isAncestorOf(id, ownProps.nodeId, presentState.nodes))
            continue;

          if (isCleanedUp)
            continue;

          settled = false;
          break;
        }
      } else {
        settled = false;
      }

      if (!node)
        return {
          node: null, 
          kind: null, 
          error, 
          executing, 
          settled,
        };

      const kind = getKindForNode(node, presentState.nodes);

      return {
        node,
        kind,
        error,
        executing,
        settled, 
      };
    }
    
    return {
      node: null, 
      kind: null, 
      error: null, 
      executing: false, 
      settled: false, 
    };
  },
  (dispatch, ownProps) => ({ 
    cleanup() { 
      if (ownProps.nodeId) {
        dispatch(createCleanup(ownProps.nodeId)); 
      }
    },
    clearErrorAndRaise() { 
      dispatch(createClearError()); 
      if (ownProps.nodeId) {
        dispatch(createRaise(ownProps.nodeId)); 
      }
    },
    exec() { 
      if (ownProps.nodeId) {
        dispatch(createExecute(ownProps.nodeId)); 
      }
    },
    stopExec() { 
      if (ownProps.nodeId) {
        dispatch(createStop(ownProps.nodeId)); 
      }
    }, 
  })
)(StageProjectionImpl);
