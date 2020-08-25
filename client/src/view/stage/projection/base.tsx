import cx from 'classnames';
import React, {
  FunctionComponent, useEffect, useState, useRef,
} from 'react';
import { connect } from 'react-redux';
import { useTransition, animated } from 'react-spring';

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
import Audio, { playSound } from '@/resource/audio';

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
  const { top, left } = event.currentTarget.getBoundingClientRect();

  const offset = {
    x: event.clientX - left,
    y: event.clientY - top,
  };

  event.dataTransfer.setData('application/reduct-node-offset', JSON.stringify(offset));

  // stop parent projections from hijacking the drag
  event.stopPropagation();

  if (props.node?.parent)
    playSound('detach');
}

function onClick(
  event: React.MouseEvent<HTMLDivElement>,
  props: StageProjectionProps
) {
  props.clearErrorAndRaise();

  if (props.kind !== 'expression') return;
  if (props.node?.parent && props.node.locked) return;
  if (props.frozen) return;

  props.exec();
  playSound('drip');

  event.stopPropagation();
}

const StageProjectionImpl: FunctionComponent<StageProjectionProps> =
  (props) => {
    const {
      node,
      kind,
      frozen,
      error,
      executing,
      exec,
      stopExec,
    } = props;

    // whether execution is being fast-forwarded or not
    const [isFast, setFast] = useState(false);
    const timer = useRef<number | null>(null);

    useEffect(() => {
      const runner = () => {
        exec();
      };

      if (executing) {
        timer.current = setInterval(runner, isFast ? 500 : 1000) as unknown as number;

        return () => {
          if (timer.current !== null) {
            clearInterval(timer.current);
          }
        };
      }
    }, [executing, exec, isFast]);

    // transition for when this projection's node is changed
    const transition = useTransition(
      node,
      null,
      {
        from: {
          transform: 'scale(0)',
          opacity: 0,
        },
        enter: {
          transform: 'scale(1)',
          opacity: 1,
        },
        leave: {
          transform: 'scale(0)',
          filter: 'brightness(1)',
          opacity: 0,
        },
      });

    return (
      <div className='projection-animation-container'>
        {
          transition.map(({ item: node, props: style, key }) => {
            // node can be null, despite what type definitions say
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!node) return null;

            // top level nodes (nodes w/o parents) should not be considered locked
            // TODO: don't mark top level nodes as locked in the first place?
            const locked = node.parent ? node.locked : false;

            const draggable =
              // can't drag slots
              node.type !== 'missing'
              // can't drag locked nodes
              && !locked
              && !frozen;

            const steppable =
              kind === 'expression'
              && !locked
              && !frozen;

            return (
              <animated.div
                id={`projection-${node.id}`}
                key={key}
                style={style}
                className={cx('projection-interaction-container', {
                  locked,
                  draggable,
                  steppable,
                  frozen,
                })}
                draggable={draggable}
                data-node-id={node.id}
                onDragStart={e => onDragStart(e, props)}
                onDragEnd={e => onDragEnd(e)}
                onClick={e => onClick(e, props)}
              >
                {getProjectionForNode(node)}
                <ErrorBubble error={error} />
                <ExecBubble
                  executing={executing}
                  onStop={() => stopExec()}
                  onSkip={() => setFast(true)}
                />
              </animated.div>
            );
          })
        }
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

      if (!node)
        return {
          node: null,
          kind: null,
          error,
          executing,
        };

      const kind = getKindForNode(node, presentState.nodes);

      return {
        node,
        kind,
        error,
        executing,
      };
    }

    return {
      node: null,
      kind: null,
      error: null,
      executing: false,
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
