import { createAddNodeToBoard } from '@/reducer/action';
import { GlobalState } from '@/reducer/state';
import { NodeId } from '@/semantics';
import { Im, ImSet } from '@/util/im';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { StageElement } from './projection/base';

interface BoardStoreProps {
  nodeIds: ImSet<NodeId>;
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
    console.warn('could not detach', e);
  }
}

const BoardImpl: FunctionComponent<BoardProps> = 
  (props) => {
    return (
      <div id='reduct-board' onDragOver={onDragOver} onDrop={e => onDrop(e, props)}>
        {props.nodeIds.map(nodeId => <StageElement nodeId={nodeId} key={nodeId} />)}
      </div>
    );
  };

export const Board = connect(
  (state: Im<GlobalState>) => ({
    nodeIds: state.get('program').get('$present').get('board') 
  }),
  (dispatch) => ({
    addNodeToBoard(id: NodeId) { dispatch(createAddNodeToBoard(id)); }
  })
)(BoardImpl);
