import cx from 'classnames';
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

import { StageProjection } from '../../projection/base';

import { GlobalState } from '@/store/state';
import { NodeId, NodeMetadata } from '@/semantics';
import '@resources/style/react/ui/toolbox.scss';
import { DeepReadonly } from '@/util/helper';

interface ToolboxStoreProps {
  /**
   * IDs of nodes which are in the toolbox.
   */
  nodeIds: Iterable<NodeId>;

  /**
   * Toolbox metadata corresponding to each node in the toolbox.
   */
  nodeMetas: Array<NodeMetadata['toolbox'] | undefined>;
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
        <div id='reduct-toolbox-header'>
          Toolbox
        </div>
        <div id='reduct-toolbox-content'>
          {[...props.nodeIds].map((nodeId, index) => {
            const { unlimited } = props.nodeMetas[index] ?? { unlimited: false };

            return (
              <div className={cx('reduct-toolbox-item', { unlimited })} key={nodeId}>
                <StageProjection nodeId={nodeId} />
              </div>
            ); 
          })}
        </div>
      </div>
    );
  };

export const ToolboxTab = connect(
  (state: DeepReadonly<GlobalState>) => {
    const nodeIds = state.game.$present.toolbox;
    const nodeMetas = [...nodeIds].map(nodeId => {
      const node = state.game.$present.nodes.get(nodeId)!;
      return node.__meta?.toolbox;
    });

    return {
      nodeIds,
      nodeMetas,
    };
  }
)(ToolboxImpl);
