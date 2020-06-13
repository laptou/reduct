import { ValueNode } from '@/semantics/defs/value';
import React, { Component } from 'react';

interface ValueElementOwnProps<T> {
    node: ValueNode<T>;
}

export class ValueElement<T> extends Component<ValueElementOwnProps<T>> {
    public render() {
        const className = `node node-${this.props.node.type}`;
        return (
            <div className={className}>
                {this.props.node.value}
            </div>
        )
    }
}

export default ValueElement;