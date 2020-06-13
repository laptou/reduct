import { ValueNode } from '@/semantics/defs/value';
import React, { Component } from 'react';
import StageElement from './base';

interface ValueElementOwnProps<T> {
    node: ValueNode<T>;
}

export class ValueElement<T> extends Component<ValueElementOwnProps<T>> {
    public render() {
        return (
            <StageElement className={this.props.node.type}>
                {this.props.node.value}
            </StageElement>
        )
    }
}

export default ValueElement;