import { RState } from '@/reducer/state';
import { ReductNode } from '@/semantics';
import { ApplyNode } from '@/semantics/defs';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import StageElement from './base';
import { getStageElementForNode } from '.';

interface ApplyElementOwnProps {
    node: ApplyNode;
}

interface ApplyElementStoreProps {
    calleeNode: ReductNode | null;
    argumentNode: ReductNode | null;
}

type ApplyProps = ApplyElementOwnProps & ApplyElementStoreProps;

export class ApplyElement extends Component<ApplyProps> {
    public render() {
        return (
            <StageElement className='apply'>
                <div className='callee'>
                    {getStageElementForNode(this.props.calleeNode)}
                </div>
                <div className='argument'>
                    {getStageElementForNode(this.props.argumentNode)}
                </div>
            </StageElement>
        )
    }
}

export default connect((state: RState, ownProps: ApplyElementOwnProps) => ({
    calleeNode: state.nodes.get(ownProps.node.callee)?.toJS() ?? null,
    argumentNode: state.nodes.get(ownProps.node.argument)?.toJS() ?? null
}))(ApplyElement);