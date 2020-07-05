import { GlobalState } from '@/reducer/state';
import { NodeId } from '@/semantics';
import '@resources/style/react/ui/toolbox.scss';
import { DeepReadonly } from '@/util/helper';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { StageProjection } from '../projection/base';

interface ToolboxStoreProps {
  nodeIds: DeepReadonly<Set<NodeId>>;
}

type ToolboxProps = ToolboxStoreProps;

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

const ToolboxImpl: FunctionComponent<ToolboxProps> = 
  (props) => {
    return (
      <div id='reduct-toolbox' onDragOver={onDragOver} onDrop={onDrop}>
        {[...props.nodeIds].map(nodeId => <StageProjection nodeId={nodeId} key={nodeId} />)}
      </div>
    );
  };

export const Toolbox = connect(
  (state: DeepReadonly<GlobalState>) => ({
    nodeIds: state.program.$present.toolbox
  })
)(ToolboxImpl);
