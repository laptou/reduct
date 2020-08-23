
import React, {
  FunctionComponent, RefObject, useLayoutEffect, useMemo, useRef, useState, useEffect,
} from 'react';
import { connect } from 'react-redux';
import { animated, useTransition } from 'react-spring';

import { StageProjection } from '../projection/base';

import { NodeId } from '@/semantics';
import { createClearError, createMoveNodeToBoard } from '@/store/action/game';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import { placeRects } from '@/view/layout/grid';

import '@resources/style/react/ui/board.scss';

interface BoardStoreProps {
  level: number;
  board: DeepReadonly<Set<NodeId>>;
  added: DeepReadonly<Map<NodeId, NodeId | null>>;
  removed: DeepReadonly<Map<NodeId, boolean>>;
}

interface BoardDispatchProps {
  /**
   * Moves a node to the board.
   * @param node The node to move to the board.
   */
  moveNodeToBoard(node: NodeId): void;

  /**
   * Clears any errors currently held by the store.
   */
  clearError(): void;
}

type BoardProps = BoardStoreProps & BoardDispatchProps;

interface NodePos {
  /**
   * The ID of the node whose position is represented.
   */
  nodeId: NodeId;

  x: number;
  y: number;

  /**
   * True if the node has been moved by the user at any point.
   */
  isUserPositioned: boolean;

  /**
   * True if the node has already been positioned by the automatic layout
   * engine.
   */
  isAutoPositioned: boolean;

  /**
   * The index of the level that this node belongs to. Used to eliminate stale
   * node position info.
   */
  level: number;
}

function onDragOver(event: React.DragEvent<HTMLDivElement>) {
  if (!event.dataTransfer.types.includes('application/reduct-node')) return;
  event.preventDefault();
}

function onDrop(
  event: React.DragEvent<HTMLDivElement>,
  props: BoardProps,
  board: RefObject<HTMLDivElement>,
  setPositions: (cb: (positions: Map<NodeId, NodePos>) => Map<NodeId, NodePos>) => void
) {
  const nodeId = parseInt(event.dataTransfer.getData('application/reduct-node'));
  if (!nodeId || isNaN(nodeId)) return;

  event.preventDefault();
  event.stopPropagation();

  if (!props.board.has(nodeId)) {
    try {
      props.moveNodeToBoard(nodeId);
    } catch (e) {
    // TODO: show toast to user
      console.warn('could not add node to board', e);
    }
  }

  // get drag offset data
  const serializedOffset = event.dataTransfer.getData('application/reduct-node-offset');
  const offset = serializedOffset ? JSON.parse(serializedOffset) : {
    x: 0,
    y: 0,
  };

  const boardEl = board.current!;
  const {
    top: boardTop, left: boardLeft, height: boardHeight, width: boardWidth,
  } = boardEl.getBoundingClientRect();

  const boardCenterX = boardLeft + boardWidth / 2;
  const boardCenterY = boardTop + boardHeight / 2;

  const x = Math.max(-boardWidth / 2, Math.min(boardWidth / 2, event.clientX - boardCenterX - offset.x));
  const y = Math.max(-boardHeight / 2, Math.min(boardHeight / 2, event.clientY - boardCenterY - offset.y));

  setPositions((positions) => {
    const newPositions = new Map(positions);

    newPositions.set(nodeId, {
      nodeId,
      x,
      y,
      isAutoPositioned: false,
      isUserPositioned: true,
      level: props.level,
    });

    return newPositions;
  });
}

const BoardImpl: FunctionComponent<BoardProps> =
  (props) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState(new Map<NodeId, NodePos>());

    const {
      board, added, level, clearError,
    } = props;

    const transitions = useTransition(
      [...board],
      id => id,
      {
        from: { opacity: 0 },
        enter: { opacity: 1 },
        leave: {
          opacity: 0,
          transform: 'scale(0)',
        },
      }
    );

    // create a map to use to store references to divs
    const boardItemRefs = useMemo(
      () => {
        const refsMap = new Map<NodeId, React.RefObject<HTMLDivElement>>();

        for (const id of board) {
          refsMap.set(id, React.createRef<HTMLDivElement>());
        }

        return refsMap;
      },
      [board]
    );

    // when level changes, remove node positions from previous level
    useEffect(() => {
      setPositions(positions =>
        new Map<NodeId, NodePos>(
          [...positions].filter(([_id, pos]) => pos.level === level)
        )
      );
    }, [level]);

    // use useLayoutEffect instead of useEffect b/c this needs to execute after
    // React has created elements but before the browser can paint (to avoid
    // elements "jumping" around)
    useLayoutEffect(() => setPositions(positions => {
      const updatedPositions = new Map<NodeId, NodePos>();

      const padding = 10;
      const boardDiv = boardRef.current!;
      const boardBounds = boardDiv.getBoundingClientRect();
      const boardScroll = {
        x: boardDiv.scrollLeft,
        y: boardDiv.scrollTop,
      };

      // placement algorithm doesn't like negative coordinates so we need to
      // temporarily offset everything into positive coordinates
      const topLeft = {
        x: 0,
        y: 0,
      };

      const fixedNodeBounds = [];
      const movableNodeBounds = [];

      for (const [nodeId, sourceNodeId] of added) {
        const positionInfo = positions.get(nodeId);
        const sourcePositionInfo = sourceNodeId && positions.get(sourceNodeId);

        const ref = boardItemRefs.get(nodeId);
        const boardItemDiv = ref?.current;
        if (!boardItemDiv) continue;

        const {
          x, y, width, height,
        } = boardItemDiv.getBoundingClientRect();

        if (sourcePositionInfo && !positionInfo?.isUserPositioned) {
          // this node was the result of stepping another node, place it on top
          // of the node that created it
          const newNodePosition = {
            nodeId,
            x: sourcePositionInfo.x + Math.random() * 40 - 20,
            y: sourcePositionInfo.y + Math.random() * 40 - 20,
            isAutoPositioned: false,
            isUserPositioned: true,
            level,
          };

          updatedPositions.set(nodeId, newNodePosition);

          const fixedRect = {
            id: nodeId,
            x: newNodePosition.x + boardScroll.x - padding,
            y: newNodePosition.y + boardScroll.y - padding,
            w: width + padding * 2,
            h: height + padding * 2,
          };

          fixedNodeBounds.push(fixedRect);

          topLeft.x = Math.min(topLeft.x, fixedRect.x);
          topLeft.y = Math.min(topLeft.y, fixedRect.y);
        } else if (positionInfo?.isUserPositioned || positionInfo?.isAutoPositioned) {
          // this node already has a position, do not move it
          const fixedRect = {
            id: nodeId,
            x: x +   boardScroll.x - padding,
            y: y + boardScroll.y - padding,
            w: width + padding * 2,
            h: height + padding * 2,
          };

          fixedNodeBounds.push(fixedRect);

          topLeft.x = Math.min(topLeft.x, fixedRect.x);
          topLeft.y = Math.min(topLeft.y, fixedRect.y);
        } else {
          // this node doesn't have an assigned position, add it to the movable nodes
          movableNodeBounds.push({
            id: nodeId,
            w: width + padding * 2,
            h: height + padding * 2,
          });
        }
      }

      const results = placeRects(
        {
          w: boardBounds.width,
          h: boardBounds.height,
        },
        movableNodeBounds,
        fixedNodeBounds.map(fixedRect => {
          fixedRect.x -= topLeft.x;
          fixedRect.y -= topLeft.y;
          return fixedRect;
        })
      );

      for (const placed of results) {
        const {
          id, x, y, w, h,
        } = placed;

        updatedPositions.set(id, {
          nodeId: id,
          x: x - boardBounds.width / 2 + w / 2 + padding + topLeft.x,
          y: y - boardBounds.height / 2 + h / 2 + padding + topLeft.y,
          isAutoPositioned: true,
          isUserPositioned: false,
          level,
        });
      }

      return new Map([...positions, ...updatedPositions]);
    }), [added, boardItemRefs, level]);

    return (
      <div
        id='reduct-board'
        onDragOver={onDragOver}
        onDrop={e => onDrop(e, props, boardRef, setPositions)}
        onClick={() => clearError()}
        ref={boardRef}
      >
        {
          transitions.map(({ item: id, key, props }) => {
            let style: React.CSSProperties;
            const pos = positions.get(id);

            if (pos) {
              const translate = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
              style = {
                ...props,
                transform:
                  props.transform
                    ? props.transform as string + ' ' + translate
                    : translate,
              };
            } else {
              style = {
                ...props,
                visibility: 'hidden',
              };
            }

            return (
              <animated.div
                className='projection-board-wrapper'
                style={style}
                key={key}
                ref={boardItemRefs.get(id)}
              >
                <StageProjection nodeId={id} />
              </animated.div>
            );
          })
        }
      </div>
    );
  };

export const Board = connect(
  ({
    game: {
      $present: {
        added, removed, board, level,
      },
    },
  }: DeepReadonly<GlobalState>) => ({
    added,
    removed,
    board,
    level,
  }),
  (dispatch) => ({
    moveNodeToBoard(id: NodeId) { dispatch(createMoveNodeToBoard(id)); },
    clearError() { dispatch(createClearError()); },
  })
)(BoardImpl);
