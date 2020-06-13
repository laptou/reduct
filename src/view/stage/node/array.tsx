import { RState } from '@/reducer/state';
import { ReductNode } from '@/semantics';
import { ArrayNode } from '@/semantics/defs';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import getStageElementForNode from '.';

interface ArrayElementOwnProps {
    node: ArrayNode;
}

interface ArrayElementStoreProps {
    items: ReductNode[];
}

type ArrayProps = ArrayElementOwnProps & ArrayElementStoreProps;

export class ArrayElement extends Component<ArrayProps> {
    public render() {
        return (
            <ul className='node node-array'>
                {
                    this.props.items.map(item => 
                        <li className='item'>{getStageElementForNode(item)}</li>
                    )
                }
            </ul>
        )
    }
}

export default connect((state: RState, ownProps: ArrayElementOwnProps) => {
    const items = [];
    for (let i = 0; i < ownProps.node.length; i++) {
        const item = state.nodes.get(ownProps.node[`elem${i}`]);
        if (item) items.push(item.toJS());
    }
    return { items };
})(ArrayElement);