import type { BaseNode } from '..';

export interface ValueNode<T> extends BaseNode {
  fields: { value: T };
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
  fields: {
    color: string;
    value: any;
  };
}

export interface DynVarNode extends BaseNode {
  type: 'dynamicVariant';
  fields: {
    value: any;
    variant: any;
  };
}

export type ReductSymbol = 'star' | 'circle' | 'triangle' | 'rect';

export interface SymbolNode extends BaseNode {
  type: 'symbol';
  fields: {
    name: ReductSymbol;
  };
}

// TODO: what are unsol and dynamicVariant?

// export const unsol: NodeDef<UnsolNode> = {
//   kind: 'value',
//   type: 'unsol',
//   fields: ['color'],
//   subexpressions: ['value'],
//   projection: {
//     type: 'default',
//     shape: '()',
//     color: (expr) => expr.color,
//   },
// };

// export const dynamicVariant: NodeDef<DynVarNode> = {
//   kind: 'value',
//   type: (semant, state, types, expr) => ({
//     types: new Map([[expr.id, expr.variant]]),
//     // TODO: this isn't true if it's a variant with
//     // fields
//     complete: true,
//   }),
//   fields: ['variant', 'value'],
//   subexpressions: [],
//   projection: {
//     type: 'default',
//     shape: '()',
//     color: 'cornsilk',
//     fields: ['value'],
//   },
// };
