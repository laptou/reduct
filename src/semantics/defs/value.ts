import { RNode } from '..';
import { ExprDefinition } from '.';

export interface ValueNode<T> extends RNode {
    value: T;
}

export interface DynValueNode extends RNode {
    value: any;
    variant: any;
}

export interface SymbolNode extends RNode {
    name: 'star' | 'circle' | 'triangle' | 'rect';
}

export const number: ExprDefinition<ValueNode<number>> = {
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

export const dynamicVariant: ExprDefinition<DynValueNode> = {
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

export const symbol: ExprDefinition<SymbolNode> = {
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

export const bool: ExprDefinition<ValueNode<boolean>> = {
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

export const string: ExprDefinition<ValueNode<string>> = {
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

export const unsol: ExprDefinition<any> = {
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
