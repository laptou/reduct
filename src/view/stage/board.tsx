import { createAddNodeToBoard } from '@/reducer/action';
import { GlobalState } from '@/reducer/state';
import { NodeId } from '@/semantics';
import { DeepReadonly } from '@/util/helper';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { StageProjection } from './projection/base';

interface BoardStoreProps {
  nodeIds: DeepReadonly<NodeId[]>;
}

interface BoardDispatchProps {
  addNodeToBoard(node: NodeId): void;
}

type BoardProps = BoardStoreProps & BoardDispatchProps;

function onDragOver(event: React.DragEvent<HTMLDivElement>) {
  if (!event.dataTransfer.types.includes('application/reduct-node')) return;
  event.preventDefault();
}

function onDrop(event: React.DragEvent<HTMLDivElement>, props: BoardProps) {
  const nodeId = parseInt(event.dataTransfer.getData('application/reduct-node'));
  if (!nodeId || isNaN(nodeId)) return;

  event.preventDefault();
  event.stopPropagation();

  try {
    props.addNodeToBoard(nodeId);
  } catch (e) {
    // TODO: show toast to user
    console.warn('could not add node to board', e);
  }
}

const BoardImpl: FunctionComponent<BoardProps> = 
  (props) => {
    // exit transitions don't really work b/c nodes are often removed from the
    // node map and from the board at the same time TODO: separate removing from
    // board and removing from node map into 2 actions
    return (
      <div id='reduct-board' onDragOver={onDragOver} onDrop={e => onDrop(e, props)}>
        <TransitionGroup component={null}>
          {props.nodeIds.map(nodeId => 
            <CSSTransition 
              classNames='projection' 
              timeout={5000}
              unmountOnExit
              key={nodeId}
            >
              <StageProjection nodeId={nodeId} />
            </CSSTransition>
          )}
        </TransitionGroup>
      </div>
    );
  };

export const Board = connect(
  (state: DeepReadonly<GlobalState>) => ({
    nodeIds: [...state.program.$present.board]
  }),
  (dispatch) => ({
    addNodeToBoard(id: NodeId) { dispatch(createAddNodeToBoard(id)); }
  })
)(BoardImpl);
