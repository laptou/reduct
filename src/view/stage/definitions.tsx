import { GlobalState } from '@/reducer/state';
import { NodeId } from '@/semantics';
import { DeepReadonly } from '@/util/helper';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { StageProjection } from './projection/base';
import { createMoveNodeToDefs } from '@/reducer/action';

interface DefinitionsStoreProps {
  nodeIds: NodeId[];
}

interface DefinitionsDispatchProps {
  moveNodeToDefs(id: NodeId): void;
}

type DefinitionsProps = 
  DefinitionsStoreProps & 
  DefinitionsDispatchProps;

function onDragOver(event: React.DragEvent<HTMLDivElement>) {
  if (!event.dataTransfer.types.includes('application/reduct-node')) return;
  
  event.dataTransfer.dropEffect = 'move';
  
  event.preventDefault();
  event.stopPropagation();
}

function onDrop(
  event: React.DragEvent<HTMLDivElement>,
  props: DefinitionsProps
) {
  const nodeId = parseInt(event.dataTransfer.getData('application/reduct-node'));
  if (!nodeId || isNaN(nodeId)) return;

  try {
    props.moveNodeToDefs(nodeId);
  } catch (e) {
    // TODO: show toast to user
    console.warn('could not add node to defs', e);
  }

  event.preventDefault();
  event.stopPropagation();
}

const DefinitionsImpl: FunctionComponent<DefinitionsProps> = 
  (props) => {
    return (
      <div id='reduct-definitions' onDragOver={onDragOver} onDrop={e => onDrop(e, props)}>
        {props.nodeIds.map(nodeId => <StageProjection nodeId={nodeId} key={nodeId} frozen />)}
      </div>
    );
  };

export const Definitions = connect(
  (state: DeepReadonly<GlobalState>) => ({
    // TODO: only show globals which are referenced by something on the board
    // or in the toolbox
    nodeIds: Array.from(state.program.$present.globals.values())
  }),
  (dispatch) => ({
    moveNodeToDefs(id: NodeId) {
      dispatch(createMoveNodeToDefs(id));
    }
  })
)(DefinitionsImpl);
