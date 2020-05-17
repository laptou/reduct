import type { NodeDef } from './base';
import type { BaseNode, NodeId } from '..';

export interface ValueNode<T> extends BaseNode {
    value: T;
}

export interface NumberNode extends ValueNode<number> {
    type: 'number';
}

export interface StrNode extends ValueNode<string> {
    type: 'string';
}

export interface BoolNode extends ValueNode<boolean> {
    type: 'boolean';
}

export interface UnsolNode extends BaseNode {
    type: 'unsol';
    color: string;
    value: any;
}

export interface DynVarNode extends BaseNode {
    value: any;
    variant: any;
}

export type ReductSymbol = 'star' | 'circle' | 'triangle' | 'rect';

export interface SymbolNode extends BaseNode {
    type: 'symbol';
    name: ReductSymbol;
}

export const number: NodeDef<NumberNode> = {
    kind: 'value',
    type: 'number',
    fields: ['value'],
    subexpressions: [],
    projection: {
        type: 'default',
        shape: '()',
        color: 'cornsilk',
        highlightColor: 'orangered',
        fields: ['value']
    }
};

export const symbol: NodeDef<SymbolNode> = {
    kind: 'value',
    type: 'symbol',
    fields: ['name'],
    subexpressions: [],
    goalNames: {
        star: ['star', 'a star', 'stars'],
        circle: ['circle', 'a circle', 'circles'],
        triangle: ['triangle', 'a triangle', 'triangles'],
        square: ['square', 'a square', 'squares']
    },
    projection: {
        type: 'case',
        on: 'name',
        cases: {
            star: {
                type: 'symbol',
                symbol: 'star'
            },
            circle: {
                type: 'symbol',
                symbol: 'circle'
            },
            triangle: {
                type: 'symbol',
                symbol: 'triangle'
            },
            rect: {
                type: 'symbol',
                symbol: 'rect'
            }
        }
    }
};

export const bool: NodeDef<BoolNode> = {
    kind: 'value',
    type: 'boolean',
    fields: ['value'],
    subexpressions: [],
    projection: {
        type: 'default',
        shape: '<>',
        color: 'hotpink',
        fields: ['value'],
        padding: {
            left: 25,
            right: 25,
            inner: 10,
            top: 0,
            bottom: 0
        }
    }
};

export const string: NodeDef<StrNode> = {
    kind: 'value',
    type: 'string',
    fields: ['value'],
    subexpressions: [],
    projection: {
        type: 'default',
        shape: '()',
        color: 'lightgreen',
        fields: ['\'"\'', 'value', '\'"\'']
    }
};

export const unsol: NodeDef<UnsolNode> = {
    kind: 'value',
    type: 'unsol',
    fields: ['color'],
    subexpressions: ['value'],
    projection: {
        type: 'default',
        shape: '()',
        color: (expr) => expr.get('color')
    }
};

export const dynamicVariant: NodeDef<DynVarNode> = {
    kind: 'value',
    type: (semant, state, types, expr) => ({
        types: new Map([[expr.get('id'), expr.get('variant')]]),
        // TODO: this isn't true if it's a variant with
        // fields
        complete: true
    }),
    fields: ['variant', 'value'],
    subexpressions: [],
    projection: {
        type: 'default',
        shape: '()',
        color: 'cornsilk',
        fields: ['value']
    }
};
