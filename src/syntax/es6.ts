import { ReductNode } from '@/semantics';
import { LambdaNode } from '@/semantics/defs';
import { Semantics } from '@/semantics/transform';
import {
  createApplyNode, createArrayNode, createBinOpNode, createBoolNode, createConditionalNode, createDefineNode, createLambdaArgNode, createLambdaNode, createMemberNode, createMissingNode, createNotNode, createNumberNode, createOpNode, createReferenceNode, createStrNode, createSymbolNode, createVtupleNode 
} from '@/semantics/util';
import * as esprima from 'esprima';
// eslint-disable-next-line import/no-unresolved
import type * as estree from 'estree';
import * as progression from '../game/progression';

function modifier(ast: esprima.Program) {
  if (ast.body.length !== 2) return null;
  if (ast.body[0].type !== 'ExpressionStatement') return null;

  if (ast.body[0].expression.type === 'CallExpression'
        && ast.body[0].expression.callee.type === 'Identifier') {
    return [
      {
        name: ast.body[0].expression.callee.name,
        params: ast.body[0].expression.arguments.map((x) => x.name)
      },
      ast.body[1]
    ];
  }

  if (ast.body[0].expression.type !== 'Identifier') return null;
  return [ast.body[0].expression.name, ast.body[1]];
}

export class ES6Parser {
    public semantics: Semantics;

    /**
     * Creates a new ES6 parser with the given semantics
     */
    public constructor(semantics: Semantics) {
      this.semantics = semantics;
    }

    public parse(program: string, macros: any) {
      const ast = esprima.parseScript(program);
      const mod = modifier(ast);

      if (ast.body.length === 1) {
        const result = this.parseNode(ast.body[0], macros);
        if (result === null) {
          return fail('Cannot parse program.', program);
        }

        return result;
      }
      if (mod !== null) {
        const [modName, node] = mod;
        const result = this.parseNode(node, macros);
        if (result === null) {
          return fail('Cannot parse node.', program);
        }

        if (modName === '__unlimited') {
          result.__meta = new this.semantics.meta.Meta({
            toolbox: this.semantics.meta.ToolboxMeta({
              unlimited: true
            })
          });
        } else if (modName === '__targetable') {
          result.__meta = new this.semantics.meta.Meta({
            toolbox: this.semantics.meta.ToolboxMeta({
              targetable: true
            })
          });
        } else if (modName === '__argumentAnnotated') {
          result.body = this.semantics.missing();
        } else if (modName.name === '__argumentAnnotated') {
          result.params = modName.params;
        } else {
          throw new Error(`Unrecognized expression modifier ${modName}`);
        }

        return result;
      }

      throw new Error('Cannot parse multi-statement programs at the moment.');
    }

    public parseNode(node: estree.Statement | estree.Declaration | estree.Expression, macros): ReductNode {
      switch (node.type) {
      case 'ExpressionStatement':
        return this.parseNode(node.expression, macros);

      case 'ReturnStatement':
        if (node.argument)
          return this.parseNode(node.argument, macros);
        else 
          throw new Error('Returning void is not supported');

      case 'BlockStatement': 
        if (node.body.length === 1) 
          return this.parseNode(node.body[0], macros);
        else 
          throw new Error('Cannot parse multi-statement programs.');

      case 'Identifier': {
        const name = node.name;
        if (node.name === '_') return createMissingNode();

        // Each macro is a thunk
        if (macros && macros[name]) return macros[name]();

        if (name === 'STAR')
          return createSymbolNode('star');

        if (name === 'RECT')
          return createSymbolNode('rect');

        if (name === 'TRIANGLE')
          return createSymbolNode('triangle');

        if (name === 'CIRCLE')
          return createSymbolNode('circle');

        // TODO: phase out xx and xxx in favour of __tuple(x, x)
        if (name === 'xx') {
          return createVtupleNode(
            createReferenceNode('x'),
            createReferenceNode('x')
          );
        }

        if (name === 'xxx') {
          return createVtupleNode(
            createReferenceNode('x'),
            createReferenceNode('x'),
            createReferenceNode('x')
          );
        }

        /*
        if (node.name.startsWith('__variant')) {
          const [variant, value] = node.name.slice(10).split('_');
          if (!variant || !value) {
            throw new Error(`Invalid dynamic variant ${node.name}`);
          }

          return this.semantics.dynamicVariant(variant, value);
        }
        */

        return createReferenceNode(name);
      }

      case 'Literal': {
        if (typeof node.value === 'number') return createNumberNode(node.value);
        if (typeof node.value === 'boolean') return createBoolNode(node.value);

        // TODO: phase out string symbols in favour of identifiers
        if (node.value === 'star'
            || node.value === 'circle'
            || node.value === 'triangle'
            || node.value === 'rect') {
          return createSymbolNode(node.value);
        }

        // Interpreting strings after symbols so as to prevent the engine from
        // treating the symbols as strings
        if (typeof node.value === 'string') 
          return createStrNode(node.value);

        throw new Error(`Unknown literal: ${node.value}`);
      }

      case 'ArrowFunctionExpression': {
        if (node.params.length === 1 && node.params[0].type === 'Identifier') {
          // Implement capture of bindings
          const argName = node.params[0].name;
          const newMacros = {};
          newMacros[argName] = () => createReferenceNode(argName);
          const body = this.parseNode(node.body, Object.assign(macros, newMacros));
          return createLambdaNode(createLambdaArgNode(argName), body);
        }

        throw new Error(`Lambdas with ${node.params.length} params are unimplemented`);
      }

      case 'AssignmentExpression': {
        throw new Error('Assignment expressions are not implemented');
      }

      case 'UnaryExpression': {
        return createNotNode(this.parseNode(node.argument, macros));
      }

      case 'BinaryExpression':
        switch (node.operator) {
        case '%':
        case '*':
        case '/':
          throw new Error(`Operator ${node.operator} is not implemented`);

        case '!==':
        case '&':
        case '**':
        case '<<':
        case '<=':
        case '===':
        case '>=':
        case '>>>':
        case '^':
        case 'in':
        case 'instanceof':
          throw new Error(`Operator ${node.operator} is not supported`);

        case '!=':
          return createNotNode(
            createBinOpNode(
              this.parseNode(node.left, macros),
              createOpNode('=='),
              this.parseNode(node.right, macros)
            )
          );

        case '+':
        case '-':
        case '==':
        case '>':
        case '<':
          return createBinOpNode(
            this.parseNode(node.left, macros),
            createOpNode(node.operator),
            this.parseNode(node.right, macros)
          );
        
        default:
          throw new Error(`Operator ${node.operator} is unknown`);
        }

      case 'LogicalExpression':
        return createBinOpNode(
          this.parseNode(node.left, macros),
          createOpNode(node.operator),
          this.parseNode(node.right, macros)
        );

      case 'CallExpression': {
        if (node.callee.type === 'Identifier') {
          if (node.callee.name === '__tuple') {
            const children = node.arguments.map((arg) => {
              if (arg.type === 'SpreadElement')
                throw new Error('Varargs are not supported');

              return this.parseNode(arg, macros);
            });

            return createVtupleNode(...children);
          }

          if (node.callee.name === '__tests') {
            const testCases = node.arguments.map((arg) => this.parseNode(arg, macros));
            // TODO: better way to figure out name
            const name = node.arguments[0].type === 'CallExpression' ? node.arguments[0].callee.name : 'f';
            return createLambdaNode(createLambdaArgNode(name), createVtupleNode(...testCases));
          }

          if (node.callee.name === '__autograder') {
          /* Color for goals
               */
            const colors = ['#c0392b', '#2980b9', '#2ecc71', '#8e44ad', '#f39c12'];

            /* Getting the alien index.
               */
            const chapter = progression.currentChapter();
            const alienIndex = Math.floor(((progression.currentLevel() - chapter.startIdx)
                                             / ((chapter.endIdx - chapter.startIdx) + 1))
                                            * chapter.resources.aliens.length);
            const alienName = chapter.resources.aliens[alienIndex];

            return this.semantics.autograder(alienName, node.arguments[0].value, colors[node.arguments[0].value], this.semantics.missing());
          }

          if (node.callee.name === 'unsol') {
          // NOTE - This should never be called externally
          // only called within inside the autograder.
            return this.semantics.unsol('red', this.parseNode(node.arguments[0], []));
          }
        }

        // TODO: implement
        if (node.arguments.length === 0) {
          throw new Error('Call expressions with 0 arguments are unimplemented');
        }

        // If the thunk can take arguments (i.e. it's a reference-with-holes), use that
        // WARNING: disabled
        // if (macros
        //         && node.callee.type === 'Identifier'
        //         && macros[node.callee.name]
        //         && macros[node.callee.name].takesArgs) {
        //   return macros[node.callee.name](...node.arguments.map((n) => this.parseNode(n, macros)));
        // }

        if (node.arguments[0].type === 'SpreadElement')
          throw new Error('Varargs are not supported');

        let result = createApplyNode(
          this.parseNode(node.callee, macros),
          this.parseNode(node.arguments[0], macros)
        );

        for (const arg of node.arguments.slice(1)) {
          if (arg.type === 'SpreadElement')
            throw new Error('Varargs are not supported');
                
          result = createApplyNode(result, this.parseNode(arg, macros));
        }

        return result;
      }

      case 'ConditionalExpression': {
        return createConditionalNode(
          this.parseNode(node.test, macros),
          this.parseNode(node.consequent, macros),
          this.parseNode(node.alternate, macros)
        );
      }

      case 'FunctionDeclaration': {
        const name = node.id!.name;
        if (node.params.length === 0) {
          return createDefineNode(name, [], this.parseNode(node.body, macros) as LambdaNode);
        }

        let result = this.parseNode(node.body, macros) as LambdaNode;

        const args = [];
        for (const arg of node.params.slice().reverse()) {
          if (arg.type !== 'Identifier')
            throw new Error(`${arg.type} is not allowed in function declarations`);

          args.push(arg.name);
          result = createLambdaNode(createLambdaArgNode(arg.name), result);
        }
        args.reverse();

        return createDefineNode(name, args, result);
      }

      case 'VariableDeclaration': {
        throw new Error('Variable declarations are unimplemented');
      }

      case 'ArrayExpression': {
        return createArrayNode(...node.elements.map(elem => {
          if (elem.type === 'SpreadElement')
            throw new Error('Array spreading is not supported');
          return this.parseNode(elem, macros)
        }));
      }

      case 'MemberExpression': {
        return createMemberNode(
          this.parseNode(node.object, macros),
          this.parseNode(node.property, macros)
        );
      }

      default: throw new Error(`Unknown node type: ${node.type}`);
      }
    }
}

// Make an unparser for a hydrated AST node
export function makeUnparser() {
  const unparseES6 = function unparseES6(node: ReductNode) {
    switch (node.type) {
    case 'missing': {
      return '_';
    }
    case 'symbol': {
      return `"${node.fields.name}"`;
    }
    case 'lambda': {
      return `(${unparseES6(node.subexpressions.arg)}) => ${unparseES6(node.subexpressions.body)}`;
    }
    case 'letExpr': {
      return `${node.variable} = ${unparseES6(node.e1)} in (${unparseES6(node.e2.body)})`;
    }
    case 'reference': {
      if (node.fields.params?.some((name) => node.subexpressions[`arg_${name}`].type !== 'missing')) {
        const args = node.fields.params.map((name) => unparseES6(node.subexpressions[`arg_${name}`])).join(', ');
        return `${node.fields.name}(${args})`;
      }
      return `${node.fields.name}`;
    }
    case 'lambdaArg':
    case 'lambdaVar': {
      return `${node.fields.name}`;
    }
    case 'not': {
      return `!${node.subexpressions.value}`;
    }
    case 'binop': {
      return `(${unparseES6(node.subexpressions.left)}) ${node.subexpressions.op.fields.name} (${unparseES6(node.subexpressions.right)})`;
    }
    case 'apply': {
      return `(${unparseES6(node.subexpressions.callee)})(${unparseES6(node.subexpressions.argument)})`;
    }
    case 'number': {
      return `${node.fields.value}`;
    }
    case 'boolean': {
      return `${node.fields.value}`;
    }
    case 'string': {
      return `${node.fields.value}`;
    }
    case 'dynamicVariant': {
      return `__variant_${node.variant}_${node.value}`;
    }
    case 'conditional': {
      return `(${unparseES6(node.subexpressions.condition)}) ? (${unparseES6(node.subexpressions.positive)}) : (${unparseES6(node.subexpressions.negative)})`;
    }
    case 'define': {
      // Make sure we accurately capture what exactly the user
      // defined, in a way that can be re-parsed. We don't use
      // the params, even if present. This avoids situations
      // like the following: the definition is annotated with
      // the argument name "x", but has no body. The user
      // instead places (y) => y.
      const args = '';
      const { body } = node.subexpressions;
      return `function ${node.fields.name}(${args}) { return ${unparseES6(body)}; }`;
    }
    case 'defineAttach': {
      // TODO: don't hardcode this
      if (node.notch0) {
        return `__defineAttach(${unparseES6(node.notch0)})`;
      }
      return '__defineAttach';
    }
    case 'arrayvalue':
    case 'array': {
      let result = '['; const
        first = true;
      if (typeof node.fields.length !== 'number') {
        throw `array length is not a number: ${node.fields.length}`;
      }
      for (let i = 0; i < node.fields.length; i++) {
        const e = node.subexpressions[i];
        if (!first) result += ',';
        result += unparseES6(e);
      }
      result += ']';
      return result;
    }
    case 'member': {
      return `${node.subexpressions.array}[${node.fields.index}]`;
    }
    case 'autograder': {
      return `__autograder(${node.fields.goalId})`;
    }
    case 'unsol': {
      return `${node.fields.value}`;
    }
    case 'vtuple': {
      return;
    }
    default:
      console.error(`unparsers.es6: Unrecognized ES6 node type "${node.type}": `, node);
      return null;
    }
  };
  return unparseES6;
}

function fail(message, node): never {
  console.warn(message, node);
  throw { message, node };
}
