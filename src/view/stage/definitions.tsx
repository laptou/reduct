import { GlobalState } from '@/reducer/state';
import { NodeId } from '@/semantics';
import { DeepReadonly } from '@/util/helper';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { StageProjection } from './projection/base';

interface DefinitionsStoreProps {
  nodeIds: NodeId[];
}

type DefinitionsProps = DefinitionsStoreProps;

function onDragOver(event: React.DragEvent<HTMLDivElement>) {
  if (!event.dataTransfer.types.includes('application/reduct-node')) return;
  
  // dropping in the toolbox is not allowed
  event.dataTransfer.dropEffect = 'none';
  
  event.preventDefault();
  event.stopPropagation();
}

function onDrop(event: React.DragEvent<HTMLDivElement>) {
  const nodeId = parseInt(event.dataTransfer.getData('application/reduct-node'));
  if (!nodeId || isNaN(nodeId)) return;

  // do nothing b/c dropping in the toolbox is not allowed

  event.preventDefault();
  event.stopPropagation();
}

const DefinitionsImpl: FunctionComponent<DefinitionsProps> = 
  (props) => {
    return (
      <div id='reduct-definitions' onDragOver={onDragOver} onDrop={onDrop}>
        {props.nodeIds.map(nodeId => <StageProjection nodeId={nodeId} key={nodeId} />)}
      </div>
    );
  };

export const Definitions = connect(
  (state: DeepReadonly<GlobalState>) => ({
    // TODO: only show globals which are referenced by something on the board
    // or in the toolbox
    nodeIds: Array.from(state.program.$present.globals.values())
  })
)(DefinitionsImpl);
