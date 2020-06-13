import React, { Component } from 'react';
import { connect } from 'react-redux';
import { RState } from '@/reducer/state';
import { NodeMap } from '@/semantics';
import getStageElementForNode from './node';

interface StageStoreProps {
    nodes: NodeMap;
}

class Stage extends Component<StageStoreProps> {
    public render() {
        return (
            <div id='stage'>
                {
                    this.props.nodes.map(imNode => getStageElementForNode(imNode.toJS()))
                }
            </div>
        );
    }
}

export default connect((state: RState) => ({ nodes: state.nodes }))(Stage);