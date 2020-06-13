import { GlobalState } from '@/reducer/state';
import { ReductNode } from '@/semantics';
import { Im, ImList } from '@/util/im';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { getElementForNode } from './element';

interface StageStoreProps {
    nodes: ImList<Im<ReductNode>>;
}

class Board extends Component<StageStoreProps> {
  public render() {
    return (
      <div id='stage'>
        {this.props.nodes.map(imNode => getElementForNode(imNode.toJS()))}
      </div>
    );
  }
}

export default connect((state: Im<GlobalState>) => {
  const nodeMap = state.get('program').get('$present').get('nodes');
  const boardNodeIds = state.get('program').get('$present').get('board');

  // warning: non-null assertion because we are assuming all IDs in the store
  // correspond to nodes that actually exist
  const boardNodes = boardNodeIds.map(id => nodeMap.get(id)!);
  return { nodes: boardNodes }
})(Board);
