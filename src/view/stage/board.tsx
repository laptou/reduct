import { GlobalState } from '@/reducer/state';
import { NodeId } from '@/semantics';
import { Im, ImList } from '@/util/im';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { StageElement } from './projection/base';

interface StageStoreProps {
    nodeIds: ImList<NodeId>;
}

class Board extends Component<StageStoreProps> {
  public render() {
    return (
      <div id='stage'>
        {this.props.nodeIds.map(nodeId => <StageElement nodeId={nodeId} key={nodeId} />)}
      </div>
    );
  }
}

export default connect((state: Im<GlobalState>) => ({
  nodeIds: state.get('program').get('$present').get('board') 
}))(Board);
