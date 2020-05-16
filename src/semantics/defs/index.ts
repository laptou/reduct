import type { Im, ImList, ImMap } from '@/util/im';
import type { RState } from '@/reducer/state';
import type {
    genericClone, genericSearch, genericEqual, genericFlatten, genericMap
} from '@/semantics/core';
import type Stage from '@/stage/stage';
import { Notch } from '@/gfx/notch';

export type RId = number;

/**
 * RNode is a Reduct node, any item that exists
 * on the board, in the toolbox, in the goal box,
 * or in the defs box.
 */
export interface RNode {
  /** The ID of this node. */
  id: RId;

  /** The ID of this node's parent. */
  parent: RId;

  /** The field in the parent node which this node
   * occupies.
   */
  parentField: string;
}

export interface ExprDefinition<N extends RNode> {
  /**
   * What kind of expression (``value``, ``expression``, ``statement``,
   * ``syntax``, or ``placeholder``). This is important—only an
   * ``expression`` can be clicked on, for instance, and reaching a
   * ``value`` will stop evaluation!
   */
  kind: ExprType | ((expr: Im<N>, semantics: Semantics, state: Im<RState>) => ExprType);


  // TODO: strong type for notches
  notches?: any[];

  /**
   * A (possibly empty) list of fields the expression should have. For
   * instance, a number expression would have a value field, or
   * definition syntax might have a name field.
   */
  fields: Exclude<keyof N, keyof RNode>[];

  /**
   * A (possibly empty) list of additional fields that contain child
   * expressions. For instance, definition syntax might have a
   * subexpression for the body.
   */
  subexpressions:
    Exclude<keyof N, keyof RNode>[] |
    ((semantics: Semantics, expr: Im<N>) => Exclude<keyof N, keyof RNode>[]);

  projection: ProjectionTemplate<N>;

  type?: any;

  targetable?: (
    semantics: Semantics,
    state: Im<RState>,
    expr: Im<N>
  ) => boolean;

  alwaysTargetable?: boolean;

  locked?: boolean;

  /**
   * This is what defines how an expression takes a small step. If
   * called, and if ``validateStep`` is defined, you can assume that
   * ``validateStep`` did not return an error.
   *
   * The result can be one of three things.
   *
   * If the result is a single expression that already exists (e.g. an
   * ``if`` expression returning one of its branches—see
   * ``src/semantics/es6/conditional.js``), you may simply return the
   * immutable expression object. (You should remove any ``parent`` and
   * ``parentField`` fields first.)
   *
   * If you are returning an entirely new expression, you can do so
   * either by returning a mutable expression or an immutable
   * expression. If returning a mutable expression, simply return the
   * constructed object. (For an example, see
   * ``src/semantics/es6/binop.js``.) If returning an immutable
   * expression (e.g. ``src/semantics/es6/apply.js``), the result is a
   * 3-tuple:
   *
   * - the ID of the node that was changed (generally will be
   *   ``expr.get("id")``),
   * - a list of node IDs that constitute the result (yes, you can step
   *   to multiple expressions, technically; this is an API artifact and
   *   most of the rest of the engine will break if you do this)
   *   [#stepmulti]_,
   * - a list of immutable expressions that were created in the
   *   process. These should have IDs assigned already.
   *
   * The reason for the three modes is for convenience: building a new
   * expression is easier when it's mutable, but some expressions, like
   * apply, call out to existing infrastructure that work with immutable
   * expressions and return such a 3-tuple, and others, like conditional,
   * simply want to return a subexpression. Generally, you won't be
   * constructing the 3-tuple manually; it'll be the result of calling
   * into the evaluation engine for something else.
   *  */
  smallStep?: (
    semantics: Semantics,
    stage: Stage,
    state: Im<RState>,
    expr: Im<N>
  ) => [RId, RId[], RNode[]] | ExprDefinition<any> | Im<ExprDefinition<any>>;

  /**
   * This is similar to ``smallStep``, except you now have an array of
   * argument expression IDs. You should probably use
   * :func:`core.genericBetaReduce`. Note that this should be defined
   * both for the overall lambda expression, as well as the "parameter
   * expressions", since the engine will look for a ``betaReduce``
   * function for the expression that the argument was dropped
   * over. (Both are needed since expressions like ``apply`` instead look
   * at the overall lambda expression.)
   */
  betaReduce?: (
    semantics: Semantics,
    stage: Stage,
    state: Im<RState>,
    expr: Im<N>,
    argIds: RId[]
  ) => [RId, RId[], RNode[]];

  stepAnimation?: (
    semantics: Semantics,
    stage: Stage,
    state: Im<RState>,
    expr: Im<N>
  ) => Promise<void>;

  stepSound?: string | string[] | ((
    semantics: Semantics,
    stage: Stage,
    state: Im<RState>,
    expr: Im<N>
  ) => string | string[]);

  /**
   * Used to validate "side conditions" in small step semantics. If there
   * is an error, return a 2-tuple of the offending node ID and a
   * descriptive error message; otherwise, return null.
   */
  validateStep?: string | ((
    semantics: Semantics,
    state: Im<RState>,
    expr: Im<N>
  ) => [RId, string] | null);

  /**
   * If present, controls the order in which subexpressions are reduced
   * before trying to small-step the parent expression. Should be a list
   * of subexpression field names.
   */
  reductionOrder?: string[];

  /**
   * If present, controls whether a subexpression should even be reduced
   * before reducing the parent. For instance, an ``if`` statement does
   * not want to reduce its branches before itself! This is also used to
   * control whether a subexpression "matters"; the engine will prevent
   * things like evaluation if an expression hole isn't filled, but some
   * expressions, like references-with-holes, don't require that they are
   * filled.
 *
   * The function is given the name of a subexpression field and should
   * return true or false.
   */
  substepFilter?: (
    semantics: Semantics,
    state: Im<RState>,
    expr: Im<N>,
    field: string
  ) => boolean;
}

// TODO: convert ExprType to a real enum
/*
export enum ExprType {
  Expr = 'expression',
  Placeholder = 'placeholder',
  Value = 'value',
  Statement = 'statement',
  Syntax = 'syntax'
}
*/

export type ExprType = 'expression' | 'placeholder' | 'value' | 'statement' | 'syntax';

export interface Semantics {
  clone: ReturnType<typeof genericClone>;
  map: ReturnType<typeof genericMap>;
  search: ReturnType<typeof genericSearch>;
  flatten: ReturnType<typeof genericFlatten>;
  equal: ReturnType<typeof genericEqual>;
  subexpressions: (node: RNode | Im<RNode>) => string[];
}

export interface SemanticDefinition {
}

// TODO: convert ProjectionType to a real enum

export interface ProjectionPadding {
  left: number;
  right: number;
  inner: number;
  top: number;
  bottom: number;
}

export type ProjectionTemplate<N extends RNode> =
  DefaultProjectionTemplate<N> |
  VboxProjectionTemplate<N> |
  HboxProjectionTemplate<N> |
  DynamicProjectionTemplate<N, any> |
  CaseProjectionTemplate<N> |
  StickyProjectionTemplate<N>;

export interface DefaultProjectionTemplate<N extends RNode> {
  type: 'default';
  color?: string;
  shape?: '<>' | '()' | 'notch' | 'none';
  fields?: string[] | ((node: N) => string[]);
  padding?: ProjectionPadding;
  subexpScale?: number;
}

export interface VboxProjectionTemplate<N extends RNode> {
  type: 'vbox';
  color?: string;
  horizontalAlign: number;
  ellipsize: boolean;
  padding?: ProjectionPadding;
  subexpScale?: number;
  rows: ProjectionTemplate<N>[];
}

export interface HboxProjectionTemplate<N extends RNode> {
  type: 'hbox';
  color?: string;
  horizontalAlign: number;
  ellipsize: boolean;
  padding?: ProjectionPadding;
  subexpScale?: number;
  rows: ProjectionTemplate<N>[];
}

export interface DynamicProjectionTemplate<N extends RNode, P extends ProjectionTemplate<N>> {
  type: 'dynamicProperty';
  field(state: Im<RState>, nodeId: RId): string;
  fields: Record<string, Record<string, (proj: P) => void>>;
  projection: P;
}

export interface StickyProjectionTemplate<N extends RNode> {
  type: 'sticky';
  // TODO: enum
  side: string;
  content: ProjectionTemplate<N>;
}

export interface CaseProjectionTemplate<
  N extends RNode,
  K extends string | number | symbol = string | number | symbol
> {
  type: 'case';
  key(nodes: ImMap<RId, Im<RNode>>, expr: Im<N>): K;
  cases: Record<K, ProjectionTemplate<N>>;
}
