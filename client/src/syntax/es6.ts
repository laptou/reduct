import * as esprima from 'esprima';
// eslint-disable-next-line import/no-unresolved
import type * as estree from 'estree';

import { ReductNode } from '@/semantics';
import { LambdaNode } from '@/semantics/defs';
import {
  createApplyNode, createArrayNode, createBinOpNode, createBoolNode, createConditionalNode, createDefineNode, createLambdaArgNode, createLambdaNode, createMemberNode, createMissingNode, createNotNode, createNumberNode, createOpNode, createIdentifierNode, createStrNode, createSymbolNode, createVtupleNode, createPtupleNode, createLetNode, createNoteNode, createReferenceNode, createVoidNode,
} from '@/semantics/util';

function modifier(ast: esprima.Program) {
  if (ast.body.length !== 2) return null;
  if (ast.body[0].type !== 'ExpressionStatement') return null;

  if (ast.body[0].expression.type === 'CallExpression'
    && ast.body[0].expression.callee.type === 'Identifier') {
    return [
      {
        name: ast.body[0].expression.callee.name,
        params: ast.body[0].expression.arguments.map((x) => x.name),
      },
      ast.body[1],
    ];
  }

  if (ast.body[0].expression.type !== 'Identifier') return null;
  return [ast.body[0].expression.name, ast.body[1]];
}

/**
 * A macro is a map from identifier names to values. This is used when parsing
 * programs to replace specific identifiers with special values (instead of just
 * parsing them as references).
 */
export type MacroMap = Map<string, () => ReductNode>;

function parseNode(node: estree.Node, macros: MacroMap): ReductNode {
  switch (node.type) {
  case 'ExpressionStatement':
    return parseNode(node.expression, macros);

  case 'ReturnStatement':
    if (node.argument)
      return parseNode(node.argument, macros);
    else
      throw new Error('Returning void is not supported');

  case 'BlockStatement':
    if (node.body.length === 1)
      return parseNode(node.body[0], macros);
    else
      throw new Error('Cannot parse multi-statement programs.');

  case 'Identifier': {
    const name = node.name;
    if (node.name === '_') return createMissingNode();

    const macro = macros.get(name);
    if (macro) return macro();

    if (name === 'STAR')
      return createSymbolNode('star');

    if (name === 'RECT')
      return createSymbolNode('rect');

    if (name === 'TRIANGLE')
      return createSymbolNode('triangle');

    if (name === 'CIRCLE')
      return createSymbolNode('circle');

    if (name === 'VOID')
      return createVoidNode();

    return createIdentifierNode(name);
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
    if (node.params.length > 0) {
      const newMacros: MacroMap = new Map(macros);

      const argNodes = node.params.map(param => {
        if (param.type !== 'Identifier')
          throw new Error(`Unsupported param type: ${param.type}`);

        // Implement capture of bindings
        const argName = param.name;
        newMacros.set(argName, () => createIdentifierNode(argName));
        return createLambdaArgNode(argName);
      });

      const body = parseNode(node.body, newMacros);

      return createLambdaNode(createPtupleNode(...argNodes), body);
    }

    throw new Error(`Lambdas with ${node.params.length} params are unimplemented`);
  }

  case 'AssignmentExpression': {
    throw new Error('Assignment expressions are not implemented');
  }

  case 'UnaryExpression': {
    switch (node.operator) {
    case '!':
      return createNotNode(parseNode(node.argument, macros));
    case '-': {
      const numberLiteral = node.argument as estree.Literal;
      const numberValue = numberLiteral.value as number;
      return createNumberNode(-numberValue);
    }
    default:
      throw new Error(`The ${node.operator} operator is not supported`);
    }
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
          parseNode(node.left, macros),
          createOpNode('=='),
          parseNode(node.right, macros)
        )
      );

    case '+':
    case '-':
    case '==':
    case '>':
    case '<':
      return createBinOpNode(
        parseNode(node.left, macros),
        createOpNode(node.operator),
        parseNode(node.right, macros)
      );

    default:
      throw new Error(`Operator ${node.operator} is unknown`);
    }

  case 'LogicalExpression':
    return createBinOpNode(
      parseNode(node.left, macros),
      createOpNode(node.operator),
      parseNode(node.right, macros)
    );

  case 'CallExpression': {
    if (node.callee.type === 'Identifier') {

      if (node.callee.name === '__let') {
        const [ident, value, block] = node.arguments;

        if (ident.type !== 'Identifier') {
          throw new Error('First parameter of a let expression must be an identifier.');
        }

        if (block.type !== 'ArrowFunctionExpression') {
          throw new Error('Third parameter of a let expression must be an arrow function.');
        }

        if (node.arguments.length > 3) {
          throw new Error('Let expressions only require 3 arguments.');
        }

        return createLetNode(
          createIdentifierNode(ident.name),
          parseNode(value, macros),
          parseNode(block.body, macros)
        );
      }

      if (node.callee.name === '__note') {
        const [text] = node.arguments;

        if (text.type !== 'Literal' || typeof text.value !== 'string')  {
          throw new Error('First parameter of a let expression must be a string literal.');
        }

        if (node.arguments.length > 3) {
          throw new Error('Note blocks only require 1 argument.');
        }

        return createNoteNode(
          text.value
        );
      }

      if (node.callee.name === '__tuple') {
        const children = node.arguments.map((arg) => {
          if (arg.type === 'SpreadElement')
            throw new Error('Varargs are not supported');

          return parseNode(arg, macros);
        });
        return createVtupleNode(...children);
      }

      if (node.callee.name === '__tests') {
        const testCases = node.arguments.map((arg) => parseNode(arg, macros));
        // TODO: better way to figure out name
        const name = node.arguments[0].type === 'CallExpression' ? node.arguments[0].callee.name : 'f';
        return createLambdaNode(createPtupleNode(createLambdaArgNode(name)), createVtupleNode(...testCases));
      }

      if (node.callee.name === '__autograder') {
        /* Color for goals
                 */
        const colors = [
          '#c0392b', '#2980b9', '#2ecc71', '#8e44ad', '#f39c12',
        ];

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
        return this.semantics.unsol('red', parseNode(node.arguments[0], []));
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
    //   return macros[node.callee.name](...node.arguments.map((n) => parseNode(n, macros)));
    // }

    const argNodes = node.arguments.map(arg => parseNode(arg, macros));

    return createApplyNode(
      parseNode(node.callee, macros),
      createPtupleNode(...argNodes)
    );
  }

  case 'ConditionalExpression': {
    return createConditionalNode(
      parseNode(node.test, macros),
      parseNode(node.consequent, macros),
      parseNode(node.alternate, macros)
    );
  }

  case 'FunctionDeclaration': {
    const name = node.id!.name;
    if (node.params.length === 0) {
      return createDefineNode(name, [], parseNode(node.body, macros) as LambdaNode);
    }

    const body = parseNode(node.body, macros) as LambdaNode;

    const args = [];
    for (const arg of node.params.slice().reverse()) {
      if (arg.type !== 'Identifier')
        throw new Error(`${arg.type} is not allowed in function declarations`);

      args.push(arg.name);
    }

    args.reverse();

    return createDefineNode(name, args, createLambdaNode(
      createPtupleNode(...args.map(arg => createLambdaArgNode(arg))),
      body
    ));
  }

  case 'VariableDeclaration': {
    throw new Error('Variable declarations are unimplemented');
  }

  case 'ArrayExpression': {
    return createArrayNode(...node.elements.map(elem => {
      if (elem.type === 'SpreadElement')
        throw new Error('Array spreading is not supported');
      return parseNode(elem, macros);
    }));
  }

  case 'MemberExpression': {
    return createMemberNode(
      parseNode(node.object, macros),
      parseNode(node.property, macros)
    );
  }

  default: throw new Error(`Cannot parse ES6 node: ${node.type}`);
  }
}

export function parseProgram(program: string, macros: MacroMap = new Map()) {
  const ast = esprima.parseScript(program);
  const mod = modifier(ast);

  if (ast.body.length === 1) {
    const result = parseNode(ast.body[0], macros);

    if (result === null) {
      throw new Error('Cannot parse program.');
    }

    return result;
  }

  if (mod !== null) {
    const [modName, node] = mod;
    const result = parseNode(node, macros);

    if (result === null) {
      throw new Error('Cannot parse node.');
    }

    if (modName === '__unlimited') {
      result.__meta = {
        toolbox: {
          unlimited: true,
          targetable: false,
        },
      };
    } else if (modName === '__targetable') {
      result.__meta = {
        toolbox: {
          targetable: true,
          unlimited: false,
        },
      };
    } else if (modName === '__argumentAnnotated') {
      result.body = createMissingNode();
    } else if (modName.name === '__argumentAnnotated') {
      result.params = modName.params;
    } else {
      throw new Error(`Unrecognized expression modifier ${modName}`);
    }

    return result;
  }

  throw new Error('Cannot parse multi-statement programs at the moment.');
}

export function serializeNode(node: ReductNode): string {
  switch (node.type) {
  case 'missing': {
    return '_';
  }
  case 'symbol': {
    return `"${node.fields.name}"`;
  }
  case 'lambda': {
    return `(${serializeNode(node.subexpressions.arg)}) => ${serializeNode(node.subexpressions.body)}`;
  }
  case 'let': {
    return `${node.variable} = ${serializeNode(node.e1)} in (${serializeNode(node.e2.body)})`;
  }
  case 'identifier': {
    if (node.fields.params?.some((name) => node.subexpressions[`arg_${name}`].type !== 'missing')) {
      const args = node.fields.params.map((name) => serializeNode(node.subexpressions[`arg_${name}`])).join(', ');
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
    return `(${serializeNode(node.subexpressions.left)}) ${node.subexpressions.op.fields.name} (${serializeNode(node.subexpressions.right)})`;
  }
  case 'apply': {
    return `(${serializeNode(node.subexpressions.callee)})(${serializeNode(node.subexpressions.argument)})`;
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
    return `(${serializeNode(node.subexpressions.condition)}) ? (${serializeNode(node.subexpressions.positive)}) : (${serializeNode(node.subexpressions.negative)})`;
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
    return `function ${node.fields.name}(${args}) { return ${serializeNode(body)}; }`;
  }
  case 'defineAttach': {
    // TODO: don't hardcode this
    if (node.notch0) {
      return `__defineAttach(${serializeNode(node.notch0)})`;
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
      result += serializeNode(e);
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
}
