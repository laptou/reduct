
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

type Bounds = { left: number; top: number; right: number; bottom: number; };

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
  boardBounds: Bounds,
  boardOffset: { x: number; y: number; },
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
  const nodeOffset = serializedOffset
    ? JSON.parse(serializedOffset)
    : {
      x: 0,
      y: 0,
    };

  const boardCenterX = (boardBounds.left + boardBounds.right) / 2;
  const boardCenterY = (boardBounds.top + boardBounds.bottom) / 2;

  let x = event.clientX - boardCenterX - nodeOffset.x + boardOffset.x;
  let y = event.clientY - boardCenterY - nodeOffset.y + boardOffset.y;

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

function onScroll(
  event: React.WheelEvent<HTMLDivElement>,
  contentBounds: Bounds,
  boardBounds: Bounds,
  setOffset: (setter: (offset: { x: number; y: number; }) => { x: number; y: number; }) => void
) {
  let deltaX: number, deltaY: number;

  if (event.shiftKey) {
    deltaX = event.deltaY;
    deltaY = event.deltaX;
  } else {
    deltaX = event.deltaX;
    deltaY = event.deltaY;
  }

  if (event.altKey) {
    deltaX /= 3;
    deltaY /= 3;
  }

  event.stopPropagation();

  setOffset(offset => {
    // calculate by how much the content of the board extends off the board
    const boardHeight = boardBounds.bottom - boardBounds.top;
    const boardWidth = boardBounds.right - boardBounds.left;

    const leftExtent = Math.min(0, boardWidth / 2 - contentBounds.left);
    const rightExtent = Math.max(0, contentBounds.right - boardWidth / 2);
    const topExtent = Math.min(0, boardHeight / 2 - contentBounds.top);
    const bottomExtent = Math.max(0, contentBounds.bottom - boardHeight / 2);

    return {
      x: Math.max(leftExtent - 50, Math.min(rightExtent + 50, offset.x + deltaX)),
      y: Math.max(topExtent - 50, Math.min(bottomExtent + 50, offset.y + deltaY)),
    };
  });
}

const BoardImpl: FunctionComponent<BoardProps> =
  (props) => {
    const boardRef = useRef<HTMLDivElement>(null);

    const [positions, setPositions] = useState(
      new Map<NodeId, NodePos>()
    );
    const [boardOffset, setOffset] = useState({
      x: 0,
      y: 0,
    });

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

    // calculate the bounds of the items of the board
    const contentBounds = useRef<Bounds>({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    });

    // calculate the bounds of the board
    const boardBounds = useRef<Bounds>({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    });

    // when level changes, remove node positions from previous level
    useEffect(() => {
      setPositions(positions =>
        new Map<NodeId, NodePos>(
          [...positions].filter(([_id, pos]) => pos.level === level)
        )
      );
    }, [level]);

    // when positions are updated, calculate the outer bounds of all of the items
    // this is used for scrolling
    useEffect(() => {
      if (!boardRef.current) return;

      const boardBounds = boardRef.current.getBoundingClientRect();
      const boardCenterX = boardBounds.left + boardBounds.width / 2;
      const boardCenterY = boardBounds.top + boardBounds.height / 2;

      let newContentBounds = null;

      for (const boardItemRef of boardItemRefs.values()) {
        if (!boardItemRef.current) continue;
        const itemBounds = boardItemRef.current.getBoundingClientRect();

        if (newContentBounds) {
          newContentBounds = {
            left: Math.min(newContentBounds.left, itemBounds.left),
            top: Math.min(newContentBounds.top, itemBounds.top),
            right: Math.max(newContentBounds.right, itemBounds.right),
            bottom: Math.max(newContentBounds.bottom, itemBounds.bottom),
          };
        } else {
          newContentBounds = itemBounds;
        }
      }

      if (!newContentBounds) return;

      contentBounds.current = {
        left: newContentBounds.left - boardCenterX - boardOffset.x,
        top: newContentBounds.top - boardCenterY - boardOffset.y,
        right: newContentBounds.right - boardCenterX - boardOffset.x,
        bottom: newContentBounds.bottom - boardCenterY - boardOffset.y,
      };

    // we do not want this calculation to re-run when offset changes
    // b/c the whole point of including the offset is to make the result
    // independent of the offset
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boardItemRefs, positions]);

    // update the size of the board
    useLayoutEffect(() => {
      if (!boardRef.current) return;
      boardBounds.current = boardRef.current.getBoundingClientRect();
    }, []);

    // use useLayoutEffect instead of useEffect b/c this needs to execute after
    // React has created elements but before the browser can paint (to avoid
    // elements "jumping" around)
    useLayoutEffect(() => setPositions(positions => {
      const updatedPositions = new Map<NodeId, NodePos>();

      const padding = 10;

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
            x: sourcePositionInfo.x + (Math.random() - 0.5) * width,
            y: sourcePositionInfo.y + (Math.random() - 0.5) * width,
            isAutoPositioned: false,
            isUserPositioned: true,
            level,
          };

          updatedPositions.set(nodeId, newNodePosition);

          const fixedRect = {
            id: nodeId,
            x: newNodePosition.x - padding,
            y: newNodePosition.y - padding,
            w: width + padding * 2,
            h: height + padding * 2,
          };

          fixedNodeBounds.push(fixedRect);
        } else if (positionInfo?.isUserPositioned || positionInfo?.isAutoPositioned) {
          // this node already has a position, do not move it
          const fixedRect = {
            id: nodeId,
            x: x - padding,
            y: y - padding,
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
          w: 2000,
          h: 2000,
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
          id, x, y,
        } = placed;

        updatedPositions.set(id, {
          nodeId: id,
          x: x - 1000 + padding + topLeft.x,
          y: y - 1000 + padding + topLeft.y,
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
        onDrop={e => onDrop(e, props, boardBounds.current, boardOffset, setPositions)}
        onClick={() => clearError()}
        onWheel={e => onScroll(e, contentBounds.current, boardBounds.current, setOffset)}
        ref={boardRef}
      >
        <div
          id='reduct-board-inner'
          style={{
            transform: `translate(${-boardOffset.x}px, ${-boardOffset.y}px)`,
          }}
        >
          {
            transitions.map(({ item: id, key, props }) => {
              let style: React.CSSProperties;
              const pos = positions.get(id);

              if (pos) {
                style = {
                  ...props,
                  left: `calc(${pos.x}px)`,
                  top: `calc(${pos.y}px)`,
                };
              } else {
                style = {
                  ...props,
                  visibility: 'hidden',
                };
              }

              return (
                <animated.div
                  className='projection-board-container'
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
