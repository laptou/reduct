/* eslint-disable class-methods-use-this */
/**
 * @module transform
 */
import { produce } from 'immer';

import * as progression from '../game/progression';
import * as gfx from '../gfx/core';
import * as fx from '../gfx/fx';
import { getProjector, ViewFn } from '../gfx/projector';
import Logging from '../logging/logging';
import { nextId } from '../store/reducer';

import type {
  BoolNode,
  DefineNode, DynVarNode, LambdaArgNode, LambdaVarNode,
  MissingNode, NumberNode, StrNode,
  SymbolNode,
} from './defs';
import { NodeDef } from './defs/base';
import type { ReductSymbol } from './defs/value';
import makeInterpreter from './interpreter';

import {
  BaseNode, NodeId, NodeMap, ReductNode,
} from '.';

import { DeepReadonly, dethunk, DRF } from '@/util/helper';
import BaseStage from '@/stage/basestage';
import {
  genericClone, genericEqual, genericFlatten, genericMap, genericSearch,
} from '@/semantics/core';
import { GameState } from '@/store/state';


export interface SemanticParserDefinition {
    parse: (program: any, macros: any) => string;
    unparse: (node: ReductNode) => string;
    extractDefines(semantics: Semantics, expr: DRF): [string, any];
    extractGlobals(semantics: Semantics, expr: DRF): [string, DRF];
    extractGlobalNames(semantics: Semantics, name: string, expr: DRF): [string, any];
}

export interface SemanticParser {
    parse(program: string, macros: any): string;
    unparse(node: ReductNode): string;
    extractDefines(semantics: Semantics, expr: DRF): [string, any];
    extractGlobals(semantics: Semantics, expr: DRF): [string, DRF];
    extractGlobalNames(semantics: Semantics, name: string, expr: DRF): [string, any];
}

export interface SemanticDefinition {
    name: string;
    parser: SemanticParserDefinition;
    expressions: { [K in ReductNode['type']]: NodeDef<ReductNode> | Array<NodeDef<ReductNode>> };
}

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

    public boolean!: (value: boolean) => BoolNode;

    public str!: (value: string) => StrNode;

    public number!: (value: number) => NumberNode;

    public symbol!: (name: ReductSymbol) => SymbolNode;

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

      this.projections.vtuple = [
        () => gfx.layout.vbox((id, state) => {
          const node = state.nodes.get(id);
          const result = [];
          for (let i = 0; i < node.fields.size; i++) {
            result.push(node.subexpressions[i]);
          }
          return result;
        }, {
          padding: {
            top: 0,
            inner: 5,
            bottom: 0,
            left: 0,
            right: 0,
          },
          strokeWhenChild: false,
          subexpScale: 1,
        }),
      ];

      const ctors: Record<string, ((...args: any[]) => BaseNode)[]> = {};

      // Add default definitions for vtuple
      /**
         * A "virtual tuple" which kind of bleeds presentation into the
         * semantics. Represents a set of values that go together, but spill
         * onto the board when they are the top-level node.
         */
      this.vtuple = function vtuple(children) {
        const result = {
          type: 'vtuple',
          kind: 'expression',
          locked: true,
          subexpressions: {},
          fields: { size: children.length },
          parent: null,
          parentField: null,
        };
        let i = 0;
        for (const child of children) {
          result.subexpressions[i] = child;
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
            const result: ReductNode = {
              type: exprName,
              locked: true,
              fields: {},
              subexpressions: {},
              parent: null,
              parentField: null,
            };

            if (typeof exprDefinition.locked !== 'undefined') {
              result.locked = exprDefinition.locked;
            }

            if (typeof exprDefinition.notches !== 'undefined') {
              result.notches = exprDefinition.notches.map((n) => new NotchRecord(n));
            }

            let argPointer = 0;
            for (const fieldName of exprDefinition.fields) {
              result.fields[fieldName] = params[argPointer++];
            }

            const subexprs = dethunk(exprDefinition.subexpressions, result);

            for (const fieldName of subexprs) {
              result.subexpressions[fieldName] = params[argPointer++];
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
                fields: exprDefinition.fields ?? [],
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
        parse: definition.parser.parse,
        unparse: definition.parser.unparse,
        extractDefines: definition.parser.extractDefines,
        extractGlobals: definition.parser.extractGlobals,
        extractGlobalNames: definition.parser.extractGlobalNames,
      };

      this.meta = meta;
    }

    /** The remnants of type checking. */
    public collectTypes(state: GameState, rootExpr) {
      const result = new Map();
      const completeness = new Map();
      const nodes = state.nodes;

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

      const step = (expr: ReductNode) => {
        const id = expr.id;

        for (const field of this.subexpressions(expr)) {
          step(nodes.get(expr.subexpressions[field]));
        }

        const type = expr.type;
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
                .map((field) => completeness.get(expr.subexpressions[field])
                             || this.kind(state, nodes.get(expr.subexpressions[field])) !== 'expression')
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
                .map((field) => completeness.get(expr.subexpressions[field])
                             || completeKind(this.kind(state, nodes.get(expr.subexpressions[field]))))
                .every((x) => x)
            );
          } else {
            completeness.set(id, true);
            update(id, typeDefn);
          }
        }
      };

      step(rootExpr);

      return {
        types: result,
        completeness,
      };
    }

    /** Check the equality of all subexpressions as well. */
    public deepEqual(nodes: NodeMap, n1: ReductNode, n2: ReductNode) {
      if (!this.shallowEqual(n1, n2)) return false;

      if (n1.type === 'array') {
        if (n1.length !== n2.length) return false;
        for (let i = 0; i < n1.length; i++) {
          const e1 = nodes.get(n1.get(`elem${i}`));
          const e2 = nodes.get(n2.get(`elem${i}`));

          if (!this.deepEqual(nodes, e1, e2)) return false;
        }
      }

      return true;
    }

    /** Get the definition of the given expression, accounting for fade level. */
    public definitionOf<N extends ReductNode>(node: DeepReadonly<N> | DRF<N>, fadeLevel?: number): NodeDef<N>;

    public definitionOf<N extends ReductNode>(nodeType: N['type'], fadeLevel?: number): NodeDef<N>;

    public definitionOf(nodeOrType: DeepReadonly<ReductNode> | DRF<ReductNode> | ReductNode['type'], fadeLevel?: number) {
      const type = typeof nodeOrType === 'object' ? nodeOrType.type : nodeOrType;
      const result = this.definition.expressions[type];
      if (Array.isArray(result)) {
        return result[typeof fadeLevel === 'number' ? fadeLevel : progression.getFadeLevel(type)];
      }
      return result;
    }

    /** Check whether a node is detachable from its parent. */
    public detachable(state: DeepReadonly<GameState>, parentId: NodeId, childId: NodeId) {
      const parent = state.nodes.get(parentId)!;
      const child = state.nodes.get(childId)!;

      const defn = this.definitionOf(parent);
      const parentField = child.parentField;

      if (!parentField?.startsWith('notch')) {
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
    public droppable(state: DeepReadonly<GameState>, itemId: NodeId, targetId: NodeId) {
      // TODO: don't hardcode these checks
      const item = state.nodes.get(itemId)!;
      const target = state.nodes.get(targetId)!;

      if (item.type === 'define') {
        return false;
      }
      if (target.type === 'missing') {
        // Use type inference to decide whether hole can be filled
        const holeType = target.ty;
        const exprType = item.ty;
        if (!holeType || !exprType || holeType === exprType) {
          return 'hole';
        }
      } else if (target.type === 'lambdaArg'
                && !state.nodes.get(target.parent!)!.parent
                // Lambda vars can't be dropped into lambda args
                && item.type !== 'lambdaVar') {
        return 'arg';
      }
      return false;
    }

    /** Check whether a node has any notches. */
    public hasNotches(node: ReductNode) {
      return 'notches' in node;
    }

    public hydrate(nodes: DeepReadonly<NodeMap>, node: ReductNode) {
      return produce(node, (draft) => {
        for (const field of this.subexpressions(draft)) {
          draft.subexpressions[field] = this.hydrate(nodes, nodes.get(draft.subexpressions[field]));
        }
      });
    }

    /**
     * Check whether we should ignore the given node when matching
     * nodes to determine victory.
     */
    public ignoreForVictory(state: DeepReadonly<GameState>, node: ReductNode) {
      const defn = this.definitionOf(node);
      return this.kind(state, node) === 'syntax' || (defn && defn.ignoreForVictory);
    }


    /** Get the kind of an expression (e.g., "expression", "value", "statement"). */
    public kind(state: DeepReadonly<GameState>, node: DRF) {
      const def = this.definitionOf(node);
      return dethunk(def.kind, node, state.nodes);
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
    public mightBeCompleted(state: DeepReadonly<GameState>, checkVictory) {
      const containsReduceableExpr = [...state.board.values(), ...state.toolbox.values()].some((id) => {
        const node = state.nodes.get(id)!;
        const kind = this.kind(state, node);
        return kind === 'expression'
            || kind === 'statement'
            || node.type === 'lambda'
            || node.type === 'identifier';
      });

      if (containsReduceableExpr) {
        return true;
      }

      // Level is not yet completed, no reducible expressions, and
      // nothing in toolbox -> level can't be completed
      if (state.toolbox.size === 0) {
        return false;
      }

      // Only one thing in toolbox - does using it complete the level?
      if (state.toolbox.size === 1) {
        return checkVictory(produce(state, draft => {
          for (const toolboxNode of draft.toolbox)
            draft.board.add(toolboxNode);
          draft.toolbox.clear();
        }));
      }

      // Try adding any combination of toolbox items to the board -
      // does using them complete the level?

      // Thanks to Nina Scholz @ SO:
      // https://stackoverflow.com/a/42774126
      // Generates all array subsets (its powerset).
      const powerset = <U>(array: U[]) => {
        const result: U[][] = [];

        const fork = (i: number, t: U[]) => {
          if (i === array.length) {
            result.push(t);
            return;
          }
          fork(i + 1, t.concat([array[i]]));
          fork(i + 1, t);
        };

        fork(0, []);
        return result;
      };

      for (const subset of powerset(Array.from(state.toolbox))) {
        const matching = checkVictory(produce(state, (draft) => {
          for (const subsetNodeId of subset) {
            draft.toolbox.delete(subsetNodeId);
            draft.board.add(subsetNodeId);
          }
        }));

        if (matching && Object.keys(matching).length > 0) {
          return true;
        }
      }

      return false;
    }

    /** Check whether two notches on two nodes can attach. */
    public notchesAttachable(stage, state, parentId, childId, notchPair) {
      const nodes = state.nodes;
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
              blocking: blockingNodes.map((id) => stage.saveNode(id)),
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
      const notches1 = node1.notches;
      const notches2 = node2.notches;
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
    public project(stage: BaseStage, nodes: NodeMap, expr: DeepReadonly<ReductNode>) {
      if (!this.projections[expr.type]) throw `semantics.project: Unrecognized expression type ${expr.type}`;
      return this.projections[expr.type][progression.getFadeLevel(expr.type)](stage, nodes, expr);
    }

    /**
     * Search for lambda variable nodes, ignoring ones bound by a
     * lambda with the same parameter name deeper in the tree.
     */
    public searchNoncapturing(nodes: NodeMap, targetName: string, exprId: NodeId) {
      const result = [];
      this.map(nodes, exprId, (nodes, id) => {
        const node = nodes.get(id);
        if (node.type === 'lambdaVar' && node.fields.name === targetName) {
          result.push(id);
          return [node, nodes];
        }
        return [node, nodes];
      }, (nodes, node) => (
        node.type !== 'lambda'
                || nodes.get(node.subexpressions.arg).fields.name !== targetName));
      return result;
    }

    /** Check for equality of fields (but not of subexpressions). */
    public shallowEqual<
      T1 extends ReductNode,
      T2 extends ReductNode
    >(n1: DeepReadonly<T1>, n2: DeepReadonly<T2>) {
      if (n1.type !== n2.type) return false;

      for (const field of this.definitionOf(n1).fields) {
        if (n1.fields[field] !== n2.fields[field]) return false;
      }

      return true;
    }

    /**
     * Return a list of field names containing subexpressions of an expression.
     * The expression may be represented in either hydrated or immutable form.
     */
    public subexpressions(expr: DeepReadonly<ReductNode> | DRF) {
      if (expr.type === 'vtuple') {
        const result = [];
        for (let i = 0; i < expr.fields.size; i++) {
          result.push(i);
        }
        return result;
      }

      if (expr.type === 'array') {
        const result = [];
        for (let i = 0; i < expr.fields.length; i++) {
          result.push(i);
        }
        return result;
      }

      const defn = this.definitionOf(expr.type, expr.fadeLevel);
      if (!defn)
        throw new Error(`semantics.subexpressions: Unrecognized expression type ${expr.type}`);

      const subexprBase = defn.reductionOrder || defn.subexpressions;
      const subexprs = typeof subexprBase === 'function'
        ? subexprBase(this, expr)
        : defn.reductionOrder || defn.subexpressions;
        // Handle notches
      if (defn.notches && defn.notches.length > 0) {
        const result = subexprs.slice();
        for (let i = 0; i < defn.notches.length; i++) {
          const field = `notch${i}`;
          if (expr.fields[field]) {
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
    public targetable(state: GameState, expr: ReductNode) {
      const defn = this.definitionOf(expr);
      if (defn && defn.targetable && typeof defn.targetable === 'function') {
        return defn.targetable(this, state, expr);
      }
      return !expr.parent || !expr.locked || (defn?.alwaysTargetable === true);
    }
}