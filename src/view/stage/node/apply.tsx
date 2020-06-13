import React, { Component } from 'react';
import { ApplyNode } from '@/semantics/defs';
import { connect } from 'react-redux';
import { RState } from '@/reducer/state';
import { ReductNode } from '@/semantics';
import getStageElementForNode from '.';

interface ApplyOwnProps {
    node: ApplyNode;
}

interface ApplyStoreProps {
    calleeNode: ReductNode | null;
    argumentNode: ReductNode | null;
}

type ApplyProps = ApplyOwnProps & ApplyStoreProps;

export class Apply extends Component<ApplyProps> {
    public render() {
        return (
            <div className='node node-apply'>
                <div className='callee'>
                    {getStageElementForNode(this.props.calleeNode)}
                </div>
                <div className='argument'>
                    {getStageElementForNode(this.props.argumentNode)}
                </div>
            </div>
        )
    }
}

export default connect((state: RState, ownProps: ApplyOwnProps) => ({
    calleeNode: state.nodes.get(ownProps.node.callee)?.toJS() ?? null,
    argumentNode: state.nodes.get(ownProps.node.argument)?.toJS() ?? null
}))(Apply);