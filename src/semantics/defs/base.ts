import type { ProjectionDef } from '@/gfx/projection';
import { RState } from '@/reducer/state';
import type Stage from '@/stage/stage';
import type { DeepReadonly, Thunk, DRF } from '@/util/helper';
import type {
  BaseNode, Flat, NodeId, NodeType, NodeMap 
} from '..';
import type { Semantics } from '../transform';
import type { NodeKind } from '../util';

export interface NodeDef<N extends BaseNode> {
    /**
     * What kind of expression (``value``, ``expression``, ``statement``,
     * ``syntax``, or ``placeholder``). This is important—only an
     * ``expression`` can be clicked on, for instance, and reaching a
     * ``value`` will stop evaluation!
     */
    kind: Thunk<[DRF, DeepReadonly<NodeMap>], NodeKind>;


    // TODO: strong type for notches
    notches?: any[];

    /**
     * A (possibly empty) list of fields the expression should have. For
     * instance, a number expression would have a value field, or
     * definition syntax might have a name field.
     */
    fields: Array<keyof N['fields']>;

    /**
     * A (possibly empty) list of additional fields that contain child
     * expressions. For instance, definition syntax might have a
     * subexpression for the body.
     */
    subexpressions?: Thunk<[DRF<N>], Array<keyof N['subexpressions']>>;

    projection: ProjectionDef<N>;

    type?: N['type'] | Thunk<[Semantics, DeepReadonly<RState>, any, DRF<N>], NodeType>;

    targetable?: (
        semantics: Semantics,
        state: DeepReadonly<RState>,
        expr: DRF<N>
    ) => boolean;

    alwaysTargetable?: boolean;

    locked?: boolean;

    complete?: boolean;

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
        state: DeepReadonly<RState>,
        expr: DeepReadonly<Flat<N>>
    ) => [NodeId, NodeId[], BaseNode[]] | NodeDef<any>;

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
        state: DeepReadonly<RState>,
        expr: DeepReadonly<Flat<N>>,
        argIds: NodeId[]
    ) => [NodeId, NodeId[], BaseNode[]];

    stepAnimation?: (
        semantics: Semantics,
        stage: Stage,
        state: DeepReadonly<RState>,
        expr: DeepReadonly<Flat<N>>
    ) => Promise<void>;

    stepSound?: string | string[] | ((
        semantics: Semantics,
        stage: Stage,
        state: DeepReadonly<RState>,
        expr: DeepReadonly<Flat<N>>
    ) => string | string[]);

    /**
     * Used to validate "side conditions" in small step semantics. If there
     * is an error, return a 2-tuple of the offending node ID and a
     * descriptive error message; otherwise, return null.
     */
    validateStep?: string | ((
        semantics: Semantics,
        state: DeepReadonly<RState>,
        expr: DeepReadonly<Flat<N>>
    ) => [NodeId, string] | null);

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
      state: DeepReadonly<RState>,
      expr: DRF<N>,
      field: string
    ) => boolean;
}
