/* eslint-disable class-methods-use-this */
/**
 * @module transform
 */
import * as immutable from 'immutable';

import {
    genericClone, genericSearch, genericEqual, genericFlatten, genericMap, getField
} from '@/semantics/core';

import { Im, ImMap, ImList } from '@/util/im';
import * as progression from '../game/progression';
import Logging from '../logging/logging';

import * as gfx from '../gfx/core';
import * as fx from '../gfx/fx';
import { getProjector, ViewFn } from '../gfx/projector';


import * as meta from './meta';
import makeInterpreter from './interpreter';

import { nextId } from '../reducer/reducer';
import {
    BaseNode, NodeId, ReductNode, NodeMap
} from '.';
import { NodeDef } from './defs/base';
import type {
    BoolNode, StrNode, NumberNode, LambdaVarNode,
    LambdaArgNode, DynVarNode, SymbolNode, MissingNode, DefineNode
} from './defs';
import type { ReductSymbol } from './defs/value';

const NotchRecord = immutable.Record({
    side: 'left',
    shape: 'wedge',
    type: 'inset'
});

export interface SemanticParserDefinition {
    parse(semantics: Semantics): (program: any, macros: any) => any;
    unparse(semantics: Semantics): (node: ReductNode) => any;
    templatizeName(semantics: Semantics, name: string): string;
    extractDefines(semantics: Semantics, expr: Im<ReductNode>): [string, any];
    extractGlobals(semantics: Semantics, expr: Im<ReductNode>): [string, Im<ReductNode>];
    extractGlobalNames(semantics: Semantics, name: string, expr: Im<ReductNode>): [string, any];
    postParse(
        nodes: NodeMap,
        goal: ImList<NodeId>,
        board: ImList<NodeId>,
        toolbox: ImList<NodeId>,
        globals: ImMap<string, NodeId>): {
        nodes: NodeMap;
        goal: ImList<NodeId>;
        board: ImList<NodeId>;
        toolbox: ImList<NodeId>;
        globals: ImMap<string, NodeId>;
    };
}

export interface SemanticParser {
    parse(program: string, macros: any): any;
    unparse(node: ReductNode): any;
    templatizeName(name: string): string;
    extractDefines(semantics: Semantics, expr: Im<ReductNode>): [string, any];
    extractGlobals(semantics: Semantics, expr: Im<ReductNode>): [string, Im<ReductNode>];
    extractGlobalNames(semantics: Semantics, name: string, expr: Im<ReductNode>): [string, any];
    postParse(
        nodes: NodeMap,
        goal: ImList<NodeId>,
        board: ImList<NodeId>,
        toolbox: ImList<NodeId>,
        globals: ImMap<string, NodeId>): {
        nodes: NodeMap;
        goal: ImList<NodeId>;
        board: ImList<NodeId>;
        toolbox: ImList<NodeId>;
        globals: ImMap<string, NodeId>;
    };
}

export interface SemanticDefinition {
    name: string;
    parser: SemanticParserDefinition;
    expressions: Record<string, NodeDef<ReductNode> | NodeDef<ReductNode>[]>;
}

export type VTupleNode = BaseNode;


/**
 * This module turns a JSON-plus-functions specification of language
 * semantics and builds a module for the rest of Reduct to interact
 * with the semantics.
 */
export class Semantics {
    /**
     * The original semantics definition.
     */
    public definition: SemanticDefinition;

    public projections: Record<string, ViewFn[]> = {};

    public clone: ReturnType<typeof genericClone>;

    public map: ReturnType<typeof genericMap>;

    public search: ReturnType<typeof genericSearch>;

    public flatten: ReturnType<typeof genericFlatten>;

    public equal: ReturnType<typeof genericEqual>;

    public missing!: () => MissingNode;

    public vtuple!: (children: ReductNode[]) => VTupleNode;

    public bool!: (value: boolean) => BoolNode;

    public str!: (value: string) => StrNode;

    public number!: (value: number) => NumberNode;

    public symbol!: (value: ReductSymbol) => SymbolNode;

    public lambdaVar!: (name: string) => LambdaVarNode;

    public lambdaArg!: (name: string) => LambdaArgNode;

    public define!: () => DefineNode;

    public dynamicVariant!: (variant: any, value: any) => DynVarNode;

    public interpreter: {};

    public parser: SemanticParser;

    public meta: typeof meta;

    public constructor(definition: SemanticDefinition) {
        this.definition = definition;
        this.projections = {};

        this.projections.vtuple = [() => gfx.layout.vbox((id, state) => {
            const node = state.getIn(['nodes', id]);
            const result = [];
            for (let i = 0; i < node.get('numChildren'); i++) {
                result.push(node.get(`child${i}`));
            }
            return result;
        }, {
            padding: {
                top: 0,
                inner: 5,
                bottom: 0,
                left: 0,
                right: 0
            },
            strokeWhenChild: false,
            subexpScale: 1
        })];

        const ctors: Record<string, ((...args: any[]) => BaseNode)[]> = {};

        // Add default definitions for vtuple
        /**
         * A "virtual tuple" which kind of bleeds presentation into the
         * semantics. Represents a set of values that go together, but spill
         * onto the board when they are the top-level node.
         */
        this.vtuple = function vtuple(children) {
            const result = {
                type: 'vtuple', kind: 'expression', locked: true, numChildren: children.length
            };
            let i = 0;
            for (const child of children) {
                result[`child${i}`] = child;
                i += 1;
            }
            return result;
        };

        for (const [exprName, exprDefinitions] of Object.entries(definition.expressions)) {
            ctors[exprName] = [];
            this.projections[exprName] = [];

            const defns = Array.isArray(exprDefinitions) ? exprDefinitions : [exprDefinitions];

            let fadeLevel = 0;
            for (const exprDefinition of defns) {
                const innerFadeLevel = fadeLevel; // Capture value inside loop body
                fadeLevel += 1;
                const ctor = (...params: any[]) => {
                    const result = { type: exprName, locked: true };
                    if (typeof exprDefinition.locked !== 'undefined') {
                        result.locked = exprDefinition.locked;
                    }
                    if (typeof exprDefinition.notches !== 'undefined') {
                        result.notches = ImList(exprDefinition.notches.map((n) => new NotchRecord(n)));
                    }

                    let argPointer = 0;
                    for (const fieldName of exprDefinition.fields) {
                        result[fieldName] = params[argPointer++];
                    }
                    const subexprs = getField(exprDefinition, 'subexpressions', this, ImMap(result));
                    for (const fieldName of subexprs) {
                        result[fieldName] = params[argPointer++];
                    }
                    result.fadeLevel = innerFadeLevel;
                    return result;
                };
                Object.defineProperty(ctor, 'name', { value: exprName });
                ctors[exprName].push(ctor);

                if (typeof exprDefinition.notches !== 'undefined') {
                    exprDefinition.projection.notches = exprDefinition.notches;
                }

                this.projections[exprName].push(
                    getProjector(
                        exprDefinition.projection,
                        {
                            subExpressions: exprDefinition.subexpressions ?? [],
                            fields: exprDefinition.fields ?? []
                        }
                    )
                );
            }

            this[exprName] = (...params: any[]) => ctors[exprName][progression.getFadeLevel(exprName)](...params);
        }

        /**
         * Submodule for evaluating expressions.
         */
        this.interpreter = {};

        makeInterpreter(this);

        /** Compare two nodes for equality (recursively). */
        this.equal = genericEqual(this.subexpressions.bind(this), this.shallowEqual.bind(this));
        /** Convert a mutable node into an immutable one (recursively). */
        this.flatten = genericFlatten(nextId, this.subexpressions.bind(this));
        /** Apply a function to every node in a tree. */
        this.map = genericMap(this.subexpressions.bind(this));
        /** Search an immutable node and its children. */
        this.search = genericSearch(this.subexpressions.bind(this));
        /** Clone an immutable node and its children. */
        this.clone = genericClone(nextId, this.subexpressions.bind(this));

        this.parser = {
            templatizeName: (name) => definition.parser.templatizeName(this, name),
            parse: definition.parser.parse(this),
            unparse: definition.parser.unparse(this),
            postParse: definition.parser.postParse,
            extractDefines: definition.parser.extractDefines,
            extractGlobals: definition.parser.extractGlobals,
            extractGlobalNames: definition.parser.extractGlobalNames
        };

        this.meta = meta;
    }

    /** The remnants of type checking. */
    public collectTypes(state, rootExpr) {
        const result = new Map();
        const completeness = new Map();
        const nodes = state.get('nodes');

        // Update the type map with the type for the expression.
        const update = function update(id, ty) {
            if (!result.has(id)) {
                result.set(id, ty);
            } else {
                const prevTy = result.get(id);
                if (prevTy === 'unknown') {
                    result.set(id, ty);
                } else if (prevTy !== ty) {
                    result.set(id, 'error');
                }
            }
        };

        const completeKind = (kind) => kind !== 'expression' && kind !== 'placeholder';

        const step = (expr) => {
            const id = expr.get('id');

            for (const field of this.subexpressions(expr)) {
                step(nodes.get(expr.get(field)));
            }

            const type = expr.get('type');
            const exprDefn = this.definitionOf(type);
            if (!exprDefn) {
                if (type !== 'vtuple') console.warn(`No expression definition for ${type}`);
            } else {
                const typeDefn = exprDefn.type;
                if (typeof typeDefn === 'function') {
                    const { types, complete } = typeDefn(this, state, result, expr);
                    completeness.set(
                        id,
                        complete && this.subexpressions(expr)
                            .map((field) => completeness.get(expr.get(field))
                             || this.kind(state, nodes.get(expr.get(field))) !== 'expression')
                            .every((x) => x)
                    );
                    for (const entry of types.entries()) {
                        update(...entry);
                    }
                } else if (typeof typeDefn === 'undefined') {
                    // TODO: define constants/typing this
                    // result[id].add("unknown");
                    completeness.set(
                        id,
                        this.subexpressions(expr)
                            .map((field) => completeness.get(expr.get(field))
                             || completeKind(this.kind(state, nodes.get(expr.get(field)))))
                            .every((x) => x)
                    );
                } else {
                    completeness.set(id, true);
                    update(id, typeDefn);
                }
            }
        };

        step(rootExpr);

        return { types: result, completeness };
    }

    /** Check the equality of all subexpressions as well. */
    public deepEqual(nodes: NodeMap, n1: Im<BaseNode>, n2: Im<BaseNode>) {
        if (!this.shallowEqual(n1, n2)) return false;

        if (n1.get('type') === 'array') {
            if (n1.get('length') !== n2.get('length')) return false;
            for (let i = 0; i < n1.get('length'); i++) {
                const e1 = nodes.get(n1.get(`elem${i}`));
                const e2 = nodes.get(n2.get(`elem${i}`));

                if (!this.deepEqual(nodes, e1, e2)) return false;
            }
        }

        return true;
    }

    /** Get the definition of the given expression, accounting for fade level. */
    public definitionOf(exprOrType, fadeLevel?: number) {
        const type = exprOrType.get ? exprOrType.get('type') : (exprOrType.type || exprOrType);
        const result = this.definition.expressions[type];
        if (Array.isArray(result)) {
            return result[typeof fadeLevel === 'number' ? fadeLevel : progression.getFadeLevel(type)];
        }
        return result;
    }

    /** Check whether a node is detachable from its parent. */
    public detachable(state, parentId, childId) {
        const nodes = state.get('nodes');
        const defn = this.definitionOf(nodes.get(parentId));
        const parentField = nodes.get(childId).get('parentField');
        if (parentField.slice(0, 5) !== 'notch') {
            return true;
        }
        const notchIdx = window.parseInt(parentField.slice(5), 10);
        if (defn && defn.notches && defn.notches[notchIdx]) {
            const notchDefn = defn.notches[notchIdx];
            if (notchDefn.canDetach) {
                return notchDefn.canDetach(
                    this,
                    state,
                    parentId,
                    childId
                );
            }
        }
        return true;
    }

    /**
     * Can an expression have something dropped into it?
     */
    public droppable(state, itemId, targetId) {
        // TODO: don't hardcode these checks
        const item = state.getIn(['nodes', itemId]);
        const target = state.getIn(['nodes', targetId]);

        if (item.get('type') === 'define') {
            return false;
        }
        if (target.get('type') === 'missing') {
            // Use type inference to decide whether hole can be filled
            const holeType = target.get('ty');
            const exprType = item.get('ty');
            if (!holeType || !exprType || holeType === exprType) {
                return 'hole';
            }
        } else if (target.get('type') === 'lambdaArg'
                && !state.getIn(['nodes', target.get('parent'), 'parent'])
                // Lambda vars can't be dropped into lambda args
                && item.get('type') !== 'lambdaVar') {
            return 'arg';
        }
        return false;
    }

    /** Check whether a node has any notches. */
    public hasNotches(node) {
        return node.get('notches');
    }

    /** Turn an immutable expression into a mutable one (recursively). */
    public hydrate(nodes, expr) {
        return expr.withMutations((e) => {
            for (const field of this.subexpressions(e)) {
                e.set(field, this.hydrate(nodes, nodes.get(e.get(field))));
            }
        }).toJS();
    }

    /**
     * Check whether we should ignore the given node when matching
     * nodes to determine victory.
     */
    public ignoreForVictory(state, node) {
        const defn = this.definitionOf(node);
        return this.kind(state, node) === 'syntax' || (defn && defn.ignoreForVictory);
    }


    /** Get the kind of an expression (e.g., "expression", "value", "statement"). */
    public kind(state, expr) {
        const def = this.definitionOf(expr);
        return getField(def, 'kind', expr, this, state);
    }

    /**
     * Lock all proper subexpressions of mutable expression `expr`, and
     * return the resulting (mutated) `expr`. */
    public lockSubexprs(expr, nodes) {
        const s = this.subexpressions(expr);
        s.forEach((f) => {
            const se = expr[f];
            se.locked = true;
            this.lockSubexprs(se, nodes);
        });
        return expr;
    }

    /** Determine if a level could possibly be completed. */
    public mightBeCompleted(state, checkVictory) {
        const nodes = state.get('nodes');
        const board = state.get('board');
        const toolbox = state.get('toolbox');

        const remainingNodes = board.concat(toolbox);

        const containsReduceableExpr = remainingNodes.some((id) => {
            const node = nodes.get(id);
            const kind = this.kind(state, node);
            return kind === 'expression'
            || kind === 'statement'
            || node.get('type') === 'lambda'
            || node.get('type') === 'reference';
        });

        if (containsReduceableExpr) {
            return true;
        }

        // Level is not yet completed, no reducible expressions, and
        // nothing in toolbox -> level can't be completed
        if (toolbox.size === 0) {
            return false;
        }

        // Only one thing in toolbox - does using it complete the level?
        if (toolbox.size === 1) {
            return checkVictory(state.withMutations((s) => {
                s.set('toolbox', immutable.List());
                s.set('board', remainingNodes);
            }));
        }

        // Try adding any combination of toolbox items to the board -
        // does using them complete the level?

        // Thanks to Nina Scholz @ SO:
        // https://stackoverflow.com/a/42774126
        // Generates all array subsets (its powerset).
        const powerset = (array) => {
            const fork = (i, t) => {
                if (i === array.length) {
                    result.push(t);
                    return;
                }
                fork(i + 1, t.concat([array[i]]));
                fork(i + 1, t);
            };

            const result = [];
            fork(0, []);
            return result;
        };

        for (const subset of powerset(toolbox.toArray())) {
            const matching = checkVictory(state.withMutations((s) => {
                s.set('toolbox', toolbox.filter((i) => subset.indexOf(i) === -1));
                s.set('board', board.concat(immutable.List(subset)));
            }));
            if (matching && Object.keys(matching).length > 0) {
                return true;
            }
        }

        return false;
    }

    /** Check whether two notches on two nodes can attach. */
    public notchesAttachable(stage, state, parentId, childId, notchPair) {
        const nodes = state.get('nodes');
        const parent = nodes.get(parentId);

        // Prevent double-attaching
        if (parent.has(`notch${notchPair[0]}`)) return false;

        const defn = this.definitionOf(parent);

        if (defn && defn.notches && defn.notches[notchPair[0]]) {
            const notchDefn = defn.notches[notchPair[0]];
            if (notchDefn.canAttach) {
                const [canAttach, blockingNodes] = notchDefn.canAttach(
                    this,
                    state,
                    parentId,
                    childId,
                    notchPair
                );
                if (!canAttach) {
                    Logging.log('attached-expr-failed', {
                        parent: stage.saveNode(parentId),
                        item: stage.saveNode(childId),
                        parentNotchIdx: notchPair[0],
                        childNotchIdx: notchPair[1],
                        blocking: blockingNodes.map((id) => stage.saveNode(id))
                    });
                    blockingNodes.forEach((id) => {
                        fx.error(stage, stage.views[id]);
                    });
                    return false;
                }
            }
        }
        return true;
    }

    /** Check whether two nodes have any compatible notches. */
    public notchesCompatible(node1, node2) {
        const notches1 = node1.get('notches');
        const notches2 = node2.get('notches');
        const result = [];
        if (notches1 && notches2) {
            for (let i = 0; i < notches1.size; i++) {
                for (let j = 0; j < notches2.size; j++) {
                    const notch1 = notches1.get(i);
                    const notch2 = notches2.get(j);
                    if (notch1.shape !== notch2.shape) continue;
                    if (notch1.type === 'inset' && notch2.type !== 'outset') continue;
                    if (notch1.type === 'outset' && notch2.type !== 'inset') continue;

                    if ((notch1.side === 'left' && notch2.side === 'right')
                    || (notch1.side === 'right' && notch2.side === 'left')
                    || (notch1.side === 'top' && notch2.side === 'bottom')
                    || (notch1.side === 'bottom' && notch2.side === 'top')) {
                        result.push([i, j]);
                    }
                }
            }
        }
        return result;
    }

    /**
     * Construct the gfx view for a node. Accounts for fade level.
     *
     * @param stage
     * @param nodes - We have to provide the node map since the store
     * won't have been updated yet.
     * @param expr - The immutable expression to create a view for.
     */
    public project(stage, nodes, expr) {
        const type = expr.get('type');
        if (!this.projections[type]) throw `semantics.project: Unrecognized expression type ${type}`;
        return this.projections[type][progression.getFadeLevel(type)](stage, nodes, expr);
    }

    /**
     * Search for lambda variable nodes, ignoring ones bound by a
     * lambda with the same parameter name deeper in the tree.
     */
    public searchNoncapturing(nodes, targetName, exprId) {
        const result = [];
        this.map(nodes, exprId, (nodes, id) => {
            const node = nodes.get(id);
            if (node.get('type') === 'lambdaVar' && node.get('name') === targetName) {
                result.push(id);
                return [node, nodes];
            }
            return [node, nodes];
        }, (nodes, node) => (
            node.get('type') !== 'lambda'
                || nodes.get(node.get('arg')).get('name') !== targetName));
        return result;
    }

    /** Check for equality of fields (but not of subexpressions). */
    public shallowEqual(n1: Im<BaseNode>, n2: Im<BaseNode>) {
        if (n1.get('type') !== n2.get('type')) return false;

        for (const field of this.definitionOf(n1).fields) {
            if (n1.get(field) !== n2.get(field)) return false;
        }

        return true;
    }

    /**
     * Return a list of field names containing subexpressions of an expression.
     * The expression may be represented in either hydrated or immutable form.
     */
    public subexpressions(expr: ReductNode | Im<ReductNode>) {
        const type = 'type' in expr ? expr.type : expr.get('type');

        if (type === 'vtuple') {
            const result = [];
            const nc = expr.get?.('numChildren') ?? expr.numChildren;
            for (let i = 0; i < nc; i++) {
                result.push(`child${i}`);
            }
            return result;
        }

        if (type === 'array') {
            const result = [];
            const nc = expr.get ? expr.get('length') : expr.length;
            for (let i = 0; i < nc; i++) {
                result.push(`elem${i}`);
            }
            return result;
        }

        const fadeLevel = expr.get ? expr.get('fadeLevel') : expr.fadeLevel;

        const defn = this.definitionOf(type, fadeLevel);
        if (!defn) throw `semantics.subexpressions: Unrecognized expression type ${type}`;

        const subexprBase = defn.reductionOrder || defn.subexpressions;
        const subexprs = typeof subexprBase === 'function'
            ? subexprBase(this, expr)
            : defn.reductionOrder || defn.subexpressions;
        // Handle notches
        if (defn.notches && defn.notches.length > 0) {
            const result = subexprs.slice();
            for (let i = 0; i < defn.notches.length; i++) {
                const field = `notch${i}`;
                if (expr[field] || (expr.get && expr.get(field))) {
                    result.push(field);
                }
            }
            return result;
        }
        return subexprs;
    }

    /**
     * Is an expression selectable/hoverable by the mouse?
     */
    public targetable(state, expr) {
        const defn = this.definitionOf(expr);
        if (defn && defn.targetable && typeof defn.targetable === 'function') {
            return defn.targetable(this, state, expr);
        }
        return !expr.get('parent') || !expr.get('locked') || (defn && defn.alwaysTargetable);
    }
}
