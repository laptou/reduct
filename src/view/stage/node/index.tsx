import { ReductNode } from '@/semantics';
import React from 'react';
import ApplyElement from './apply';
import ValueElement from './value';
import { ValueNode } from '@/semantics/defs/value';
import { ArrayElement } from './array';

export default function getStageElementForNode(node: ReductNode | null) {
    if (!node) return null;

    switch (node.type) {
    case 'apply': return <ApplyElement node={node} />;
    case 'array': return <ArrayElement node={node} />;
    case 'binop': return <ApplyElement node={node} />;
    case 'boolean': 
    case 'number':
    case 'string':
        return <ValueElement node={node as ValueNode<string | boolean | number>} />;
    default: throw new Error(`unknown node type ${node.type}`);
    }
}