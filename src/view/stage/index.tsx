import { store } from '@/index';
import { RState } from '@/reducer/state';
import { NodeMap } from '@/semantics';
import React, { Component } from 'react';
import { connect, Provider } from 'react-redux';
import { getElementForNode } from './element';

interface StageStoreProps {
    nodes: NodeMap;
}

class Stage extends Component<StageStoreProps> {
  public render() {
    return (
      <Provider store={store}>
        <div id='stage'>
          {this.props.nodes.map(imNode => getElementForNode(imNode.toJS()))}
        </div>
      </Provider>
    );
  }
}

export default connect((state: RState) => ({ nodes: state.nodes }))(Stage);
