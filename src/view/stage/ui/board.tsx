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
type NodePos = { x: number; y: number; mode: 'user' | 'auto' | null };

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
    x,
    y,
    mode: 'user', 
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
        enter: (id) => {
          const { x, y } = positions.get(id) ?? {
            x: 0,
            y: 0, 
          };
          return {
            opacity: 0,
            transform: `translate(${x}px, ${y}px)`, 
          };
        },
        update: (id) => {
          const { x, y } = positions.get(id) ?? {
            x: 0,
            y: 0, 
          };
          return {
            opacity: 1,
            transform: `translate(${x}px, ${y}px)`, 
          };
        },
        leave: (id) => {
          const { x, y } = positions.get(id) ?? {
            x: 0,
            y: 0, 
          };
          return {
            opacity: 0,
            transform: `translate(${x}px, ${y}px)`, 
          };
        },
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
    
    // newly added nodes should have same position as their source nodes
    // and removed nodes should have their positions deleted
    useLayoutEffect(() => {
      const newPositions = new Map(positions);
      
      // nodes which have been moved by the user should not be moved
      // automatically
      const fixedNodeBounds = [];

      const padding = 10;

      for (const nodeId of board) {
        const positionInfo = newPositions.get(nodeId);
        if (positionInfo?.mode !== 'user') continue;

        const ref = boardItemDivRefs.get(nodeId)!;
        const boardItemDiv = ref.current;
        if (!boardItemDiv) continue;

        const {
          x, y, width, height, 
        } = boardItemDiv.getBoundingClientRect();
  
        fixedNodeBounds.push({
          x,
          y,
          w: width + padding * 2,
          h: height + padding * 2, 
        });
      }

      console.log(fixedNodeBounds);


      const boardDiv = boardRef.current!;
      const boardBounds = boardDiv.getBoundingClientRect();
      const boardScroll = {
        x: boardDiv.scrollLeft,
        y: boardDiv.scrollTop, 
      };

      const movableNodeBounds = new Map();

      for (const nodeId of board) {
        const ref = boardItemDivRefs.get(nodeId)!;
        const boardItemDiv = ref.current;
        if (!boardItemDiv) continue;

        const {
          x, y, width, height, 
        } = boardItemDiv.getBoundingClientRect();
  
        movableNodeBounds.set({
          w: width + padding * 2,
          h: height + padding * 2, 
        }, nodeId);
      }

      const results = placeRects({
        w: boardBounds.width,
        h: boardBounds.height,
      }, [...movableNodeBounds.keys()]);

      for (const [original, placed] of results) {
        const nodeId = movableNodeBounds.get(original);
        const {
          x, y, w, h, 
        } = placed;

        newPositions.set(nodeId, {
          x: x - boardBounds.width / 2 + w / 2 + padding,
          y: y - boardBounds.height / 2 + h / 2 + padding,
          mode: 'auto', 
        });
      }

      console.log(boardBounds, results);

      // for (const [newNodeId, sourceNodeId] of added) {
      //   if (!board.has(newNodeId))
      //     continue;

      //   if (newPositions.has(newNodeId))
      //     continue;

      //   const ref = boardItemDivRefs.get(newNodeId)!;
      //   const boardItemDiv = ref.current;
      //   if (!boardItemDiv) continue;
  
      //   const {
      //     x, y, width, height, 
      //   } = boardItemDiv.getBoundingClientRect();
  
      //   const rect = {
      //     x,
      //     y,
      //     w: width,
      //     h: height, 
      //   };

      //   const sourceNodePosition = sourceNodeId && newPositions.get(sourceNodeId);

      //   if (!sourceNodePosition) {
      //     continue;
      //   }

      //   // add random jitter so that new nodes don't appear in exact same location
      //   // this will also make it less likely that vtuple nodes will appear directly
      //   // on top of each other

      //   const jitterX = Math.random() * 40 - 20;
      //   const jitterY = Math.random() * 40 - 20;

      //   newPositions.set(newNodeId, {
      //     x: sourceNodePosition.x + jitterX,
      //     y: sourceNodePosition.y + jitterY,
      //     mode: sourceNodePosition.mode,
      //   });
      // }

      setPositions(newPositions);
      
      // do not want to include positions to avoid infinite loop of updates
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [added]);

    useEffect(() => {
      const newPositions = new Map(positions);

      for (const deadNode of removed.keys()) {
        newPositions.delete(deadNode);
      }

      setPositions(newPositions);

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
          transitions.map(({ item: id, key, props }) => (
            <animated.div
              className='projection-board-wrapper'
              style={props} 
              key={key}
              ref={boardItemDivRefs.get(id)}
            >
              <StageProjection nodeId={id} />
            </animated.div>
          ))
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
