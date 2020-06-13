import { ReductNode } from '@/semantics';
import { ValueNode } from '@/semantics/defs/value';
import React from 'react';
import ApplyElement from './apply';
import ArrayElement from './array';
import BinOpElement from './binop';
import ValueElement from './value';



/**
 * Gets the stage element for the given node.
 * @param node The node that is to be displayed on the stage.
 */
export function getStageElementForNode(node: ReductNode | null) {
    if (!node) return null;

    switch (node.type) {
    case 'apply': return <ApplyElement node={node} />;
    case 'array': return <ArrayElement node={node} />;
    case 'binop': return <BinOpElement node={node} />;
    case 'boolean': 
    case 'number':
    case 'string':
        return <ValueElement node={node as ValueNode<string | boolean | number>} />;
    default: throw new Error(`unknown node type ${node.type}`);
    }
}