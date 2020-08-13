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
      executing,
      cleanup: disposeNode,
      exec,
      stopExec,
    } = props;

    // whether execution is being fast-forwarded or not
    const [isFast, setFast] = useState(false);
    const timer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      const runner = () => {
        console.log(`execute ${timer.current} run for node ${node?.id}`);
        exec();
      };

      if (executing) {
        timer.current = setInterval(runner, isFast ? 500 : 1000);
        console.log(`execute ${timer.current} scheduled for node ${node?.id}`);

        return () => {
          if (timer.current !== null) {
            console.log(`execute ${timer.current} unscheduled for node ${node?.id}`);
            clearInterval(timer.current);
          }

          console.log(`clean up for ${node?.id}`);
        };
      }
    }, [executing, exec, isFast]);

    // run when this component is unmounted
    useEffect(() => () => disposeNode(), [disposeNode]);

    // transition for when this projection's node is changed
    const transition = useTransition(
      node,
      (n) => n?.id,
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