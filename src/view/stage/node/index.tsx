import React from 'react';
import { ReductNode } from '@/semantics';
import Apply from './apply';

export default function getStageElementForNode(node: ReductNode | null) {
    if (!node) return null;

    switch (node.type) {
    case 'apply': return <Apply node={node} />;
    default: throw new Error(`unknown node type ${node.type}`);
    }
}