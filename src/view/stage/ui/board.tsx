import { NodeId } from '@/semantics';
import { createClearError, createDetectCompetion, createMoveNodeToBoard } from '@/store/action';
import { GlobalState } from '@/store/state';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/board.scss';
import React, {
  FunctionComponent, RefObject, useEffect, useRef, useState 
} from 'react';
import { connect } from 'react-redux';
import { animated, useTransition } from 'react-spring';
import { StageProjection } from '../projection/base';

interface BoardStoreProps {
  board: DeepReadonly<Set<NodeId>>;
  added: DeepReadonly<Map<NodeId, NodeId | null>>;
  removed: DeepReadonly<Set<NodeId>>;
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
type NodePos = { x: number; y: number; source: 'user' | 'auto' | null };

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
  const offset = serializedOffset ? JSON.parse(serializedOffset) : { x: 0, y: 0 };

  const boardEl = board.current!;
  const {
    top: boardTop, left: boardLeft, height: boardHeight, width: boardWidth 
  } = boardEl.getBoundingClientRect();

  const boardCenterX = boardLeft + boardWidth / 2;
  const boardCenterY = boardTop + boardHeight / 2;

  const x = Math.max(-boardWidth / 2, Math.min(boardWidth / 2, event.clientX - boardCenterX - offset.x));
  const y = Math.max(-boardHeight / 2, Math.min(boardHeight / 2, event.clientY - boardCenterY - offset.y));
  
  const newPositions = new Map(positions);
  newPositions.set(nodeId, { x, y, source: 'user' });
  setPositions(newPositions);
}

const BoardImpl: FunctionComponent<BoardProps> = 
  (props) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState(new Map<NodeId, NodePos>());

    // when the board changes, check if the level has been completed
    useEffect(() => {
      props.detectCompletion();
    }, [props.board]);

    // newly added nodes should have same position as their source nodes
    // and removed nodes should have their positions deleted
    useEffect(() => {
      const newPositions = new Map(positions);

      for (const [newNode, sourceNode] of props.added) {
        if (!props.board.has(newNode))
          continue;

        if (newPositions.has(newNode))
          continue;

        if (!sourceNode) {
          const x = (Math.random() - 0.5) * 400;
          const y = (Math.random() - 0.5) * 400;
          newPositions.set(newNode, { x, y, source: null });
          continue;
        }
        
        const sourceNodePosition = newPositions.get(sourceNode);
        if (!sourceNodePosition) {
          const x = (Math.random() - 0.5) * 400;
          const y = (Math.random() - 0.5) * 400;
          newPositions.set(newNode, { x, y, source: null });
          continue;
        }

        // add random jitter so that new nodes don't appear in exact same location
        // this will also make it less likely that vtuple nodes will appear directly
        // on top of each other

        const jitterX = Math.random() * 40 - 20;
        const jitterY = Math.random() * 40 - 20;

        newPositions.set(newNode, {
          x: sourceNodePosition.x + jitterX,
          y: sourceNodePosition.y + jitterY,
          source: sourceNodePosition.source
        });
      }

      for (const deadNode of props.removed) {
        newPositions.delete(deadNode);
      }
      setPositions(newPositions);
    }, [props.added, props.removed]);


    const transitions = useTransition(
      [...props.board],
      id => id,
      {
        from: (id) => {
          let position;

          if (positions.has(id)) {
            position = positions.get(id)!;
          }

          if (!position && props.added.has(id)) {
            const source = props.added.get(id)!;
            if (positions.has(source))
              position = positions.get(source);
          }
          
          if (!position) {
            position = { x: 0, y: 0, source: null };
            const newPositions = new Map(positions);
            newPositions.set(id, position);
            setPositions(newPositions);
          }

          const { x, y } = position;
          return { opacity: 0, transform: `translate(${x}px, ${y}px) scale(0)` };
        },
        enter: (id) => {
          const { x, y } = positions.get(id) ?? { x: 0, y: 0 };
          return { opacity: 1, transform: `translate(${x}px, ${y}px) scale(1)` };
        },
        update: (id) => {
          const { x, y } = positions.get(id) ?? { x: 0, y: 0 };
          return { opacity: 1, transform: `translate(${x}px, ${y}px) scale(1)` };
        },
        leave: (id) => {
          const { x, y } = positions.get(id) ?? { x: 0, y: 0 };
          return { opacity: 0, transform: `translate(${x}px, ${y}px) scale(0)` };
        }
      }
    );

    return (
      <div id='reduct-board' 
        onDragOver={onDragOver}
        onDrop={e => onDrop(e, props, boardRef, positions, setPositions)} 
        onClick={() => props.clearError()}
        ref={boardRef}
      >
        {
          transitions.map(({ item: id, key, props }) => 
            <animated.div className='projection-board-wrapper' style={props} key={key}>
              <StageProjection nodeId={id} />
            </animated.div>
          )
        }
      </div>
    );
  };

export const Board = connect(
  ({ program: { $present: { added, removed, board } } }: DeepReadonly<GlobalState>) => ({
    added, removed, board
  }),
  (dispatch) => ({
    moveNodeToBoard(id: NodeId) { dispatch(createMoveNodeToBoard(id)); },
    detectCompletion() { dispatch(createDetectCompetion()); },
    clearError() { dispatch(createClearError()); }
  })
)(BoardImpl);
