import { createMoveNodeToBoard } from '@/reducer/action';
import { GlobalState } from '@/reducer/state';
import { NodeId } from '@/semantics';
import { DeepReadonly } from '@/util/helper';
import React, {
  FunctionComponent, RefObject, useRef, useState, useEffect, useLayoutEffect 
} from 'react';
import { connect } from 'react-redux';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { StageProjection } from './projection/base';
import { placeRects } from '../layout';

interface BoardStoreProps {
  board: DeepReadonly<Set<NodeId>>;
  added: DeepReadonly<Map<NodeId, NodeId | null>>;
  removed: DeepReadonly<Set<NodeId>>;
}

interface BoardDispatchProps {
  moveNodeToBoard(node: NodeId): void;
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

  const x = Math.max(0, Math.min(boardWidth, event.clientX - boardLeft + offset.x));
  const y = Math.max(0, Math.min(boardHeight, event.clientY - boardTop + offset.y));
  
  const newPositions = new Map(positions);
  newPositions.set(nodeId, { x, y, source: 'user' });
  setPositions(newPositions);
}

const BoardImpl: FunctionComponent<BoardProps> = 
  (props) => {
    const board = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState(new Map<NodeId, NodePos>());

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
          newPositions.set(newNode, { x: 0, y: 0, source: null });
          continue;
        }
        
        const sourceNodePosition = newPositions.get(sourceNode);
        if (!sourceNodePosition) {
          newPositions.set(newNode, { x: 0, y: 0, source: null });
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

    useLayoutEffect(() => {
      const boardEl = board.current!;
      // auto-reposition any nodes that haven't been moved by the user yet
      const boundingRect = boardEl.getBoundingClientRect();
      const childRects = new Map<{ w: number; h: number }, NodeId>();

      const padding = 10;

      for (const childEl of boardEl.children) {
        const nodeId = parseInt(childEl.getAttribute('data-node-id')!);
        const nodePosition = positions.get(nodeId)!;

        if (!nodePosition || nodePosition.source !== null)
          continue;

        childRects.set(
          {
            w: childEl.clientWidth + padding + padding,
            h: childEl.clientHeight + padding + padding
          }, 
          nodeId);
      }

      if (childRects.size === 0)
        return;

      const newPositions = new Map(positions);

      const placedRects = placeRects({ w: boundingRect.width, h: boundingRect.height }, [...childRects.keys()]);

      for (const [originalRect, placedRect] of placedRects) {
        const { x, y } = placedRect;
        const id = childRects.get(originalRect)!;
        newPositions.set(id, { x: x + padding, y: y + padding, source: 'auto' });
      }

      setPositions(newPositions);
    });

    // exit transitions don't really work b/c nodes are often removed from the
    // node map and from the board at the same time TODO: separate removing from
    // board and removing from node map into 2 actions
    return (
      <div id='reduct-board' 
        onDragOver={onDragOver}
        onDrop={e => onDrop(e, props, board, positions, setPositions)} 
        ref={board}
      >
        <TransitionGroup component={null}>
          {[...props.board].map(nodeId => 
            <CSSTransition 
              classNames='projection' 
              timeout={5000}
              unmountOnExit
              key={nodeId}
            >
              <StageProjection nodeId={nodeId} position={positions.get(nodeId)} />
            </CSSTransition>
          )}
        </TransitionGroup>
      </div>
    );
  };

export const Board = connect(
  ({ program: { $present: { added, removed, board } } }: DeepReadonly<GlobalState>) => ({
    added, removed, board
  }),
  (dispatch) => ({
    moveNodeToBoard(id: NodeId) { dispatch(createMoveNodeToBoard(id)); }
  })
)(BoardImpl);
