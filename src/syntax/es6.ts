import { Semantics } from '@/semantics/transform';
// eslint-disable-next-line import/no-unresolved
import type * as estree from 'estree';
import * as esprima from 'esprima';
import { ReductNode } from '@/semantics';
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
          return fail(`Unrecognized expression modifier ${modName}`, program);
        }

        return result;
      }

      return fail('Cannot parse multi-statement programs at the moment.', program);
    }

    public parseNode(node: estree.Statement | estree.Declaration | estree.Expression, macros) {
      switch (node.type) {
      case 'ExpressionStatement':
        return this.parseNode(node.expression, macros);

      case 'ReturnStatement':
        return this.parseNode(node.argument, macros);

      case 'BlockStatement': {
        if (node.body.length !== 1) {
          return fail('Cannot parse multi-statement programs.', node);
        }
        return this.parseNode(node.body[0], macros);
      }

      case 'Identifier': {
        if (node.name === '_') return this.semantics.missing();

        if (node.name === '__defineAttach') return this.semantics.defineAttach();

        // Each macro is a thunk
        const macroName = this.semantics.parser.templatizeName(node.name);
        if (macros && macros[macroName]) return macros[macroName]();

        if (node.name === 'xx') {
          return this.semantics.vtuple([
            this.semantics.lambdaVar('x'),
            this.semantics.lambdaVar('x')
          ]);
        }
        if (node.name === 'xxx') {
          return this.semantics.vtuple([
            this.semantics.lambdaVar('x'),
            this.semantics.lambdaVar('x'),
            this.semantics.lambdaVar('x')
          ]);
        }
        if (node.name.startsWith('__variant')) {
          const [variant, value] = node.name.slice(10).split('_');
          if (!variant || !value) {
            throw new Error(`Invalid dynamic variant ${node.name}`);
          }

          return this.semantics.dynamicVariant(variant, value);
        }

        return this.semantics.lambdaVar(macroName);
      }

      case 'Literal': {
        if (typeof node.value === 'number') return this.semantics.number(node.value);
        if (typeof node.value === 'boolean') return this.semantics.boolean(node.value);

        if (node.value === 'star'
            || node.value === 'circle'
            || node.value === 'triangle'
            || node.value === 'rect') {
          return this.semantics.symbol(node.value);
        }

        // Interpreting strings after symbols so as to prevent the engine from
        // treating the symbols as strings
        if (typeof node.value === 'string') return this.semantics.string(node.value);
        return fail(`parsers.es6: Unrecognized value ${node.value}`, node);
      }

      case 'ArrowFunctionExpression': {
        if (node.params.length === 1 && node.params[0].type === 'Identifier') {
          // Implement capture of bindings
          const argName = node.params[0].name;
          const newMacros = {};
          newMacros[argName] = () => this.semantics.lambdaVar(argName);
          const body = this.parseNode(node.body, Object.assign(macros, newMacros));
          return this.semantics.lambda(this.semantics.lambdaArg(argName), body);
        }
        return fail('Lambda expessions with more than one input are currently undefined.', node);
      }

      case 'AssignmentExpression': {
        const name = this.semantics.parser.templatizeName(node.left.name);

        const argName = node.left.name;
        const newMacros = {};
        newMacros[argName] = () => this.semantics.lambdaVar(argName);
        const body = this.parseNode(node.right.right, Object.assign(macros, newMacros));

        return this.semantics.letExpr(
          name,
          this.parseNode(node.right.left, newMacros),
          this.semantics.lambda(this.semantics.lambdaArg(argName), body)
        );
      }

      case 'UnaryExpression': {
        return this.semantics.not(this.parseNode(node.argument, macros));
      }

      case 'BinaryExpression':
        // TODO: need ExprManager
        return this.semantics.binop(this.parseNode(node.left, macros),
          this.semantics.op(node.operator),
          this.parseNode(node.right, macros));

      case 'LogicalExpression':
        // TODO: need ExprManager
        return this.semantics.binop(this.parseNode(node.left, macros),
          this.semantics.op(node.operator),
          this.parseNode(node.right, macros));

      case 'CallExpression': {
        if (node.callee.type === 'Identifier' && node.callee.name === '__tests') {
          const testCases = node.arguments.map((arg) => this.parseNode(arg, macros));
          // TODO: better way to figure out name
          const name = node.arguments[0].type === 'CallExpression' ? node.arguments[0].callee.name : 'f';
          return this.semantics.lambda(this.semantics.lambdaArg(name, true), this.semantics.vtuple(testCases));
        }

        if (node.callee.type === 'Identifier' && node.callee.name === '__autograder') {
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

        if (node.callee.type === 'Identifier' && node.callee.name === 'unsol') {
          // NOTE - This should never be called externally
          // only called within inside the autograder.
          return this.semantics.unsol('red', this.parseNode(node.arguments[0], []));
        }

        if (node.arguments.length === 0) {
          return fail('Call expressions with zero arguments are currently unsupported', node);
        }

        // If the thunk can take arguments (i.e. it's a reference-with-holes), use that

        if (macros
                && node.callee.type === 'Identifier'
                && macros[node.callee.name]
                && macros[node.callee.name].takesArgs) {
          return macros[node.callee.name](...node.arguments.map((n) => this.parseNode(n, macros)));
        }

        let result = this.semantics.apply(
          this.parseNode(node.callee, macros),
          this.parseNode(node.arguments[0], macros)
        );

        for (const arg of node.arguments.slice(1)) {
          result = this.semantics.apply(result, this.parseNode(arg, macros));
        }

        return result;
      }

      case 'ConditionalExpression': {
        return this.semantics.conditional(
          this.parseNode(node.test, macros),
          this.parseNode(node.consequent, macros),
          this.parseNode(node.alternate, macros)
        );
      }

      case 'FunctionDeclaration': {
        const name = this.semantics.parser.templatizeName(node.id.name);
        if (node.params.length === 0) {
          return this.semantics.define(name, [], this.parseNode(node.body, macros));
        }

        let result = this.parseNode(node.body, macros);
        const args = [];
        for (const arg of node.params.slice().reverse()) {
          const argName = this.semantics.parser.templatizeName(arg.name);
          args.push(argName);
          result = this.semantics.lambda(this.semantics.lambdaArg(argName), result);
        }
        args.reverse();
        return this.semantics.define(name, args, result);
      }

      case 'VariableDeclaration': {
        if (node.kind !== 'let') {
          return fail(`parsers.es6: Unrecognized '${node.kind}' declaration`, node);
        }
        if (node.declarations.length !== 1) {
          return fail('parsers.es6: Only declaring 1 item at a time is supported', node);
        }

        const name = this.semantics.parser.templatizeName(node.declarations[0].id.name);
        const body = this.parseNode(node.declarations[0].init, macros);

        return this.semantics.define(name, [], body);
      }

      case 'ArrayExpression': {
        const a = [];
        a.push(node.elements.length);
        for (const e of node.elements) {
          a.push(this.parseNode(e, macros));
        }
        return this.semantics.array(...a);
      }

      case 'MemberExpression': {
        return this.semantics.member(this.parseNode(node.object, macros),
          this.parseNode(node.property, macros));
      }

      default: return fail(`parsers.es6: Unrecognized ES6 node type ${node.type}`, node);
      }
    }
}

// Make an unparser for a hydrated AST node
export function makeUnparser(_: Semantics) {
  const unparseES6 = function unparseES6(node: ReductNode) {
    switch (node.type) {
    case 'missing': {
      return '_';
    }
    case 'symbol': {
      return `"${node.fields.name}"`;
    }
    case 'lambda': {
      if (node.subexpressions.body.type === 'vtuple') {
        if (node.subexpressions.body.subexpressions.child0.type === 'lambdaVar') {
          // Unparse replicator block
          const replicator = [];
          for (let i = 0; i < node.subexpressions.body.fields.numChildren; i++) {
            replicator.push(node.subexpressions.body.subexpressions.child0.name);
          }
          return `(${unparseES6(node.subexpressions.arg)}) => ${replicator.join('')}`;
        }

        const cases = [];
        for (let i = 0; i < node.subexpressions.body.fields.numChildren; i++) {
          cases.push(unparseES6(node.subexpressions.body.subexpressions[`child${i}`]));
        }
        return `__tests(${cases.join(', ')})`;
      }
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
    case 'bool': {
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
        const e = node.subexpressions[`elem${i}`];
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

function fail(message, node) {
  console.warn(message, node);
  throw { message, node };
}
