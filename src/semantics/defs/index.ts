import type { Im } from '@/util/im.d.ts';
import type { RState } from '@/reducer/state';
import type Stage from '@/stage/stage';

export type RId = number;

/**
 * RNode is a Reduct node, any item that exists
 * on the board, in the toolbox, in the goal box,
 * or in the defs box.
 */
export type RNode<SE extends string = any> = {
  /** The ID of this node. */
  id: RId;

  /** The ID of this node's parent. */
  parent: RId;

  /** The field in the parent node which this node
   * occupies.
   */
  parentField: string;
} & Record<SE, RId>;

export interface ExprDefinition<SE extends string = never> {
  /**
   * What kind of expression (``value``, ``expression``, ``statement``,
   * ``syntax``, or ``placeholder``). This is important—only an
   * ``expression`` can be clicked on, for instance, and reaching a
   * ``value`` will stop evaluation!
   */
  kind: ExprType | ((expr: Im<RNode<SE>>, semantics: Semantics, state: Im<RState>) => ExprType);

  /**
   * A (possibly empty) list of fields the expression should have. For
   * instance, a number expression would have a value field, or
   * definition syntax might have a name field.
   */
  fields: string[];

  /**
   * A (possibly empty) list of additional fields that contain child
   * expressions. For instance, definition syntax might have a
   * subexpression for the body.
   */
  subexpressions: [...SE[]];

  projection: ProjectionTemplate;

  type?: any;

  targetable?: (semantics: Semantics, state: Im<RState>, expr: Im<RNode<SE>>) => boolean;

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
    expr: Im<RNode<SE>>
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
    expr: Im<RNode<SE>>,
    argIds: RId[]
  ) => [RId, RId[], RNode[]];

  stepAnimation?: (
    semantics: Semantics,
    stage: Stage,
    state: Im<RState>,
    expr: Im<RNode<SE>>
  ) => Promise<void>;

  stepSound?: string | ((
    semantics: Semantics,
    stage: Stage,
    state: Im<RState>,
    expr: Im<RNode<SE>>
  ) => string);

  /**
   * Used to validate "side conditions" in small step semantics. If there
   * is an error, return a 2-tuple of the offending node ID and a
   * descriptive error message; otherwise, return null.
   */
  validateStep?: string | ((
    semantics: Semantics,
    state: Im<RState>,
    expr: Im<RNode<SE>>
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
    expr: Im<RNode<SE>>,
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

}

export interface SemanticDefinition {
}

// TODO: convert ProjectionType to a real enum
/*
export enum ProjectionType {
  Decal = 'decal'
}
*/

export type ProjectionType = 'decal';

export interface ProjectionTemplate {
  type: ProjectionType;
  content: any;
}
