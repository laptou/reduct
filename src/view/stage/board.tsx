import { createAddNodeToBoard } from '@/reducer/action';
import { GlobalState } from '@/reducer/state';
import { NodeId } from '@/semantics';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { StageProjection } from './projection/base';
import { DeepReadonly, map } from '@/util/helper';

interface BoardStoreProps {
  nodeIds: DeepReadonly<Set<NodeId>>;
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
        {map(props.nodeIds, nodeId => <StageProjection nodeId={nodeId} key={nodeId} />)}
      </div>
    );
  };

export const Board = connect(
  (state: DeepReadonly<GlobalState>) => ({
    nodeIds: state.program.$present.board
  }),
  (dispatch) => ({
    addNodeToBoard(id: NodeId) { dispatch(createAddNodeToBoard(id)); }
  })
)(BoardImpl);
