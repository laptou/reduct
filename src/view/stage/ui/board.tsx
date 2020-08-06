import React, {
  FunctionComponent, RefObject, useEffect, useRef, useState, useMemo, useLayoutEffect, 
} from 'react';
import { connect } from 'react-redux';
import { animated, useTransition } from 'react-spring';

import { StageProjection } from '../projection/base';

import { NodeId } from '@/semantics';
import { createClearError, createDetectCompetion, createMoveNodeToBoard } from '@/store/action/game';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/board.scss';
import { placeRects } from '@/view/layout/grid';

interface BoardStoreProps {
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
   * Detects whether the game is over.
   */
  detectCompletion(): void;

  /**
   * Clears any errors currently held by the store.
   */
  clearError(): void;
}

type BoardProps = BoardStoreProps & BoardDispatchProps;

// source prop indicates whether this node was moved by the user
// if it was, then we shouldn't automatically reposition it
interface NodePos {
  nodeId: NodeId;
  x: number;
  y: number;
  isUserPositioned: boolean;
  isAutoPositioned: boolean;
}

function onDragOver(event: React.DragEvent<HTMLDivElement>) {
  if (!event.dataTransfer.types.includes('application/reduct-node')) return;
  event.preventDefault();
}

function onDrop(
  event: React.DragEvent<HTMLDivElement>, 
  props: BoardProps,
  board: RefObject<HTMLDivElement>,
  positions: Map<NodeId, NodePos>,
  setPositions: (positions: Map<NodeId, NodePos>) => void
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
  
  const newPositions = new Map(positions);
  newPositions.set(nodeId, {
    nodeId,
    x,
    y,
    isAutoPositioned: false,
    isUserPositioned: true,
  });
  setPositions(newPositions);
}

const BoardImpl: FunctionComponent<BoardProps> = 
  (props) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState(new Map<NodeId, NodePos>());

    const {
      board, added, removed, detectCompletion, 
    } = props;

    // when the board changes, check if the level has been completed
    useEffect(() => detectCompletion(), [board, detectCompletion]);

    const transitions = useTransition(
      [...board],
      id => id,
      {
        from: { opacity: 0 },
        enter: { opacity: 1 },
        leave: { opacity: 0 },
      }
    );

    // create a map to use to store references to divs
    const boardItemDivRefs = useMemo(
      () => {
        const refsMap = new Map<NodeId, React.RefObject<HTMLDivElement>>();

        for (const id of board) {
          refsMap.set(id, React.createRef<HTMLDivElement>());
        }

        return refsMap;
      },
      [board]
    );
    
    useLayoutEffect(() => {
      const updatedPositions = new Map();

      const padding = 10;
      const boardDiv = boardRef.current!;
      const boardBounds = boardDiv.getBoundingClientRect();
      const boardScroll = {
        x: boardDiv.scrollLeft,
        y: boardDiv.scrollTop, 
      };
      
      const fixedNodeBounds = [];
      const movableNodeBounds = [];

      for (const [nodeId, sourceNodeId] of added) {
        const positionInfo = updatedPositions.get(nodeId);
        const sourcePositionInfo = sourceNodeId && positions.get(sourceNodeId);

        const ref = boardItemDivRefs.get(nodeId);
        const boardItemDiv = ref?.current;
        if (!boardItemDiv) continue;

        const {
          x, y, width, height, 
        } = boardItemDiv.getBoundingClientRect();
  
        if (positionInfo?.isUserPositioned || positionInfo?.isAutoPositioned) {
          // this node already has a position, do not move it
          fixedNodeBounds.push({
            id: nodeId,
            x: x + boardScroll.x - padding,
            y: y + boardScroll.y - padding,
            w: width + padding * 2,
            h: height + padding * 2, 
          });
        } else if (sourcePositionInfo) {
          // this node was the result of stepping another node, place it on top
          // of the node that created it
          const newNodePosition = {
            nodeId,
            x: sourcePositionInfo.x + Math.random() * 40 - 20,
            y: sourcePositionInfo.y + Math.random() * 40 - 20,
            isAutoPositioned: false,
            isUserPositioned: true,
          };

          updatedPositions.set(nodeId, newNodePosition);

          fixedNodeBounds.push({
            id: nodeId,
            x: newNodePosition.x + boardScroll.x - padding,
            y: newNodePosition.y + boardScroll.y - padding,
            w: width + padding * 2,
            h: height + padding * 2, 
          });
        } else {
          // this node doesn't have an assigned position, add it to the movable nodes
          movableNodeBounds.push({
            id: nodeId,
            w: width + padding * 2,
            h: height + padding * 2, 
          });
        }
      }

      console.log({
        movableNodeBounds, 
        fixedNodeBounds, 
      });

      const results = placeRects(
        {
          w: boardBounds.width,
          h: boardBounds.height,
        }, 
        movableNodeBounds, 
        fixedNodeBounds
      );

      console.log(results);

      console.log(updatedPositions);

      for (const placed of results) {
        const {
          id, x, y, w, h, 
        } = placed;

        updatedPositions.set(id, {
          nodeId: id,
          x: x - boardBounds.width / 2 + w / 2 + padding,
          y: y - boardBounds.height / 2 + h / 2 + padding,
          isAutoPositioned: true,
          isUserPositioned: false, 
        });
      }

      console.log(updatedPositions);

      setPositions(positions => new Map([...positions, ...updatedPositions]));
      
      // do not want to include positions to avoid infinite loop of updates
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [added]);

    useEffect(() => {  
      setPositions(positions => {
        const newPositions = new Map(positions);

        for (const deadNode of removed.keys()) {
          newPositions.delete(deadNode);
        }

        return newPositions;
      });

      // do not want to include positions to avoid infinite loop of updates
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [removed]);

    return (
      <div
        id='reduct-board'
        onDragOver={onDragOver}
        onDrop={e => onDrop(e, props, boardRef, positions, setPositions)} 
        onClick={() => props.clearError()}
        ref={boardRef}
      >
        {
          transitions.map(({ item: id, key, props }) => {
            const { x, y } = positions.get(id) ?? {
              x: 0,
              y: 0, 
            };

            return (
              <animated.div
                className='projection-board-wrapper'
                style={{
                  ...props,
                  transform: `translate(${x}px, ${y}px)`, 
                }}
                key={key}
                ref={boardItemDivRefs.get(id)}
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
  ({ game: { $present: { added, removed, board } } }: DeepReadonly<GlobalState>) => ({
    added,
    removed,
    board,
  }),
  (dispatch) => ({
    moveNodeToBoard(id: NodeId) { dispatch(createMoveNodeToBoard(id)); },
    detectCompletion() { dispatch(createDetectCompetion()); },
    clearError() { dispatch(createClearError()); },
  })
)(BoardImpl);
