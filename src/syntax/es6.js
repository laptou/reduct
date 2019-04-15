import * as esprima from "esprima";
import * as progression from "../game/progression";

function modifier(ast) {
    if (ast.body.length !== 2) return null;
    if (ast.body[0].type !== "ExpressionStatement") return null;

    if (ast.body[0].expression.type === "CallExpression" &&
        ast.body[0].expression.callee.type === "Identifier") {
        return [
            {
                name: ast.body[0].expression.callee.name,
                params: ast.body[0].expression.arguments.map(x => x.name),
            },
            ast.body[1],
        ];
    }

    if (ast.body[0].expression.type !== "Identifier") return null;
    return [ ast.body[0].expression.name, ast.body[1] ];
}

export function makeParser(jssemant) {
    return function parseES6(program, macros) {
        const ast = esprima.parse(program);
        console.log("ast:" + program);
        console.log(JSON.stringify(ast));
        const mod = modifier(ast);

        if (ast.body.length === 1) {
            const result = parseNode(ast.body[0], macros);
            if (result === null) {
                return fail(`Cannot parse program.`, program);
            }

            return result;
        }
        else if (mod !== null) {
            const [ modName, node ] = mod;
            let result = parseNode(node, macros);
            if (result === null) {
                return fail("Cannot parse node.", program);
            }

            if (modName === "__unlimited") {
                result.__meta = new jssemant.meta.Meta({
                    toolbox: jssemant.meta.ToolboxMeta({
                        unlimited: true,
                    }),
                });
            }
            else if (modName === "__targetable") {
                result.__meta = new jssemant.meta.Meta({
                    toolbox: jssemant.meta.ToolboxMeta({
                        targetable: true,
                    }),
                });
            }
            else if (modName === "__argumentAnnotated") {
                result.body = jssemant.missing();
            }
            else if (modName.name === "__argumentAnnotated") {
                result.params = modName.params;
            }
            else {
                return fail(`Unrecognized expression modifier ${modName}`, program);
            }

            return result;
        }
        else {
            return fail(`Cannot parse multi-statement programs at the moment.`, program);
        }
    };

    function parseNode(node, macros) {
        switch (node.type) {
        case "ExpressionStatement":
            return parseNode(node.expression, macros);

        case "ReturnStatement":
            return parseNode(node.argument, macros);

        case "BlockStatement": {
            if (node.body.length !== 1) {
                return fail("Cannot parse multi-statement programs.", node);
            }
            return parseNode(node.body[0], macros);
        }

        case "Identifier": {
            if (node.name === "_") return jssemant.missing();

            if (node.name === "__defineAttach") return jssemant.defineAttach();

            // Each macro is a thunk
            const macroName = jssemant.parser.templatizeName(node.name);
            if (macros && macros[macroName]) return macros[macroName]();

            if (node.name === "xx") {
                return jssemant.vtuple([ jssemant.lambdaVar("x"), jssemant.lambdaVar("x") ]);
            }
            else if (node.name === "xxx") {
                return jssemant.vtuple([
                    jssemant.lambdaVar("x"),
                    jssemant.lambdaVar("x"),
                    jssemant.lambdaVar("x"),
                ]);
            }
            else if (node.name.slice(0, 9) === "__variant") {
                const [ variant, value ] = node.name.slice(10).split("_");
                if (!variant || !value) {
                    throw `Invalid dynamic variant ${node.name}`;
                }

                return jssemant.dynamicVariant(variant, value);
            }

            return jssemant.lambdaVar(macroName);
        }

        case "Literal": {
            if (typeof node.value === "number") return jssemant.number(node.value);
            if (typeof node.value === "boolean") return jssemant.bool(node.value);

            if (node.value === "star" ||
                node.value === "circle" ||
                node.value === "triangle" ||
                node.value === "rect") {
                return jssemant.symbol(node.value);
            }

            return fail(`parsers.es6: Unrecognized value ${node.value}`, node);
        }

        case "ArrowFunctionExpression": {
            if (node.params.length === 1 && node.params[0].type === "Identifier") {
                // Implement capture of bindings
                const argName = node.params[0].name;
                const newMacros = {};
                newMacros[argName] = () => jssemant.lambdaVar(argName);
                const body = parseNode(node.body, Object.assign(macros, newMacros));
                return jssemant.lambda(jssemant.lambdaArg(argName), body);
            }
            return fail("Lambda expessions with more than one input are currently undefined.", node);
        }

        case "UnaryExpression": {
          return jssemant.not(parseNode(node.argument,macros));
        }

        case "BinaryExpression":
        // TODO: need ExprManager
        return jssemant.binop(parseNode(node.left, macros),
                              jssemant.op(node.operator),
                              parseNode(node.right, macros));

        case "LogicalExpression":
        // TODO: need ExprManager
        return jssemant.binop(parseNode(node.left, macros),
                              jssemant.op(node.operator),
                              parseNode(node.right, macros));

        case "CallExpression": {
            if (node.callee.type === "Identifier" && node.callee.name === "__tests") {
                const testCases = node.arguments.map(arg => parseNode(arg, macros));
                // TODO: better way to figure out name
                const name = node.arguments[0].type === "CallExpression" ? node.arguments[0].callee.name : "f";
                return jssemant.lambda(jssemant.lambdaArg(name, true), jssemant.vtuple(testCases));
            }

            if(node.callee.type === "Identifier" && node.callee.name === "__autograder") {
              /* Color for goals
               */
              const colors = ["#c0392b","#2980b9","#2ecc71","#8e44ad","#f39c12"];

              /* Getting the alien index.
               */
              const chapter = progression.currentChapter();
              const alienIndex = Math.floor(((progression.currentLevel() - chapter.startIdx) /
                                             ((chapter.endIdx - chapter.startIdx) + 1)) *
                                            chapter.resources.aliens.length);
              const alienName = chapter.resources.aliens[alienIndex];

              return jssemant.autograder(alienName, node.arguments[0].value,colors[node.arguments[0].value],jssemant.missing());
            }

            if(node.callee.type === "Identifier" && node.callee.name === "unsol") {
              //NOTE - This should never be called externally
              //only called within inside the autograder.
              return jssemant.unsol("red",parseNode(node.arguments[0],[]));
            }

            if (node.arguments.length === 0) {
                return fail("Call expressions with zero arguments are currently unsupported", node);
            }

            // If the thunk can take arguments (i.e. it's a reference-with-holes), use that

            if (macros &&
                node.callee.type === "Identifier" &&
                macros[node.callee.name] &&
                macros[node.callee.name].takesArgs) {
                return macros[node.callee.name](...node.arguments.map(n => parseNode(n, macros)));
            }

            let result = jssemant.apply(
                parseNode(node.callee, macros),
                parseNode(node.arguments[0], macros)
            );

            for (const arg of node.arguments.slice(1)) {
                result = jssemant.apply(result, parseNode(arg, macros));
            }

            return result;
        }

        case "ConditionalExpression": {
            return jssemant.conditional(
                parseNode(node.test, macros),
                parseNode(node.consequent, macros),
                parseNode(node.alternate, macros)
            );
        }

        case "FunctionDeclaration": {
            const name = jssemant.parser.templatizeName(node.id.name);
            if (node.params.length === 0) {
                return jssemant.define(name, [], parseNode(node.body, macros));
            }

            let result = parseNode(node.body, macros);
            const args = [];
            for (const arg of node.params.slice().reverse()) {
                const argName = jssemant.parser.templatizeName(arg.name);
                args.push(argName);
                result = jssemant.lambda(jssemant.lambdaArg(argName), result);
            }
            args.reverse();
            return jssemant.define(name, args, result);
        }

        case "VariableDeclaration": {
            if (node.kind !== "let") {
                return fail(`parsers.es6: Unrecognized '${node.kind}' declaration`, node);
            }
            else if (node.declarations.length !== 1) {
                return fail("parsers.es6: Only declaring 1 item at a time is supported", node);
            }

            const name = jssemant.parser.templatizeName(node.declarations[0].id.name);
            const body = parseNode(node.declarations[0].init, macros);

            return jssemant.define(name, [], body);
        }

        case "ArrayExpression": {
            const a = [];
            a.push(node.elements.length);
            for (const e of node.elements) {
                a.push(parseNode(e, macros));
            }
            return jssemant.array(...a);
        }

        case "MemberExpression": {
          return jssemant.member(parseNode(node.object,macros),
            parseNode(node.property, macros));
        }

        default: return fail(`parsers.es6: Unrecognized ES6 node type ${node.type}`, node);
        }
    }
}

// Make an unparser for a hydrated AST node
export function makeUnparser(jssemant) {
    const unparseES6 = function unparseES6(node) {
        switch (node.type) {
        case "missing": {
            return "_";
        }
        case "symbol": {
            return `"${node.name}"`;
        }
        case "lambda": {
            if (node.body.type === "vtuple") {
                if (node.body.child0.type === "lambdaVar") {
                    // Unparse replicator block
                    let replicator = [];
                    for (let i = 0; i < node.body.numChildren; i++) {
                        replicator.push(node.body.child0.name);
                    }
                    return `(${unparseES6(node.arg)}) => ${replicator.join("")}`;
                }
                else {
                    const cases = [];
                    for (let i = 0; i < node.body.numChildren; i++) {
                        cases.push(unparseES6(node.body[`child${i}`]));
                    }
                    return `__tests(${cases.join(", ")})`;
                }
            }
            return `(${unparseES6(node.arg)}) => ${unparseES6(node.body)}`;
        }
        case "reference": {
            if (node.params && node.params.some(name => node[`arg_${name}`].type !== "missing")) {
                const args = node.params.map(name => unparseES6(node[`arg_${name}`])).join(", ");
                return `${node.name}(${args})`;
            }
            return `${node.name}`;
        }
        case "lambdaArg":
        case "lambdaVar": {
            return `${node.name}`;
        }
        case "not": {
          return `!${node.value}`;
        }
        case "binop": {
            return `(${unparseES6(node.left)}) ${node.op.name} (${unparseES6(node.right)})`;
        }
        case "apply": {
            return `(${unparseES6(node.callee)})(${unparseES6(node.argument)})`;
        }
        case "number": {
            return `${node.value}`;
        }
        case "bool": {
            return `${node.value}`;
        }
        case "dynamicVariant": {
            return `__variant_${node.variant}_${node.value}`;
        }
        case "conditional": {
            return `(${unparseES6(node.condition)}) ? (${unparseES6(node.positive)}) : (${unparseES6(node.negative)})`;
        }
        case "define": {
            // Make sure we accurately capture what exactly the user
            // defined, in a way that can be re-parsed. We don't use
            // the params, even if present. This avoids situations
            // like the following: the definition is annotated with
            // the argument name "x", but has no body. The user
            // instead places (y) => y.
            const args = "";
            const body = node.body;
            return `function ${node.name}(${args}) { return ${unparseES6(body)}; }`;
        }
        case "defineAttach": {
            // TODO: don't hardcode this
            if (node.notch0) {
                return `__defineAttach(${unparseES6(node.notch0)})`;
            }
            return "__defineAttach";
        }
        case "arrayvalue":
        case "array": {
            let result = "[", first = true;
            if (typeof node.length != "number") {
                throw `array length is not a number: ${node.length}`;
            }
            for (let i = 0; i < node.length; i++) {
                const e = node[`elem${i}`];
                if (!first) result += ",";
                result += unparseES6(e);
            }
            result += "]";
            return result;
        }
        case "member": {
          return `${node.array}[${node.index}]`;
        }
        case "autograder": {
          return `__autograder(_)`;
        }
        case "unsol":{
            return `${node.value}`;
        }
        case "vtuple": {
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
    throw { message: message, node: node };
}
