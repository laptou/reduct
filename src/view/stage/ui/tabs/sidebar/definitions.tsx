import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

import { StageProjection } from '../../../projection/base';

import { GlobalState } from '@/store/state';
import { createMoveNodeToDefs } from '@/store/action/game';
import { NodeId } from '@/semantics';
import { DeepReadonly } from '@/util/helper';
import '@resources/style/react/ui/definitions.scss';

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

  props.moveNodeToDefs(nodeId);

  event.preventDefault();
  event.stopPropagation();
}

const DefinitionsImpl: FunctionComponent<DefinitionsProps> = 
  (props) => {
    return (
      <div id='reduct-definitions' onDragOver={onDragOver} onDrop={e => onDrop(e, props)}>
        {props.nodeIds.map(nodeId => <StageProjection nodeId={nodeId} key={nodeId} frozen />)}
        {props.nodeIds.length === 0 && (
          <div id='reduct-definitions-empty-state'>
            <p>
              Drag a <code>def</code> or <code>let</code> node in
              here to add it to the global scope.
            </p>
          </div>
        )}
      </div>
    );
  };

export const DefinitionsTab = connect(
  (state: DeepReadonly<GlobalState>) => ({
    // TODO: only show globals which are referenced by something on the board
    // or in the toolbox
    nodeIds: Array.from(state.game.$present.globals.values()),
  }),
  (dispatch) => ({
    moveNodeToDefs(id: NodeId) {
      dispatch(createMoveNodeToDefs(id));
    },
  })
)(DefinitionsImpl);
