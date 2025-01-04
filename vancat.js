(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined'
        ? (module.exports = factory())
        : typeof define === 'function' && define.amd
        ? define(factory)
        : ((global = global || self), (global.Vancat = factory()));
})(this, function () {
    'use strict';

    /*!
     * vancat.js - Fast and small templating engine
     * https://github.com/serhat359/vancat-js
     */

    var Vancat = (function () {
        const registeredHelpers = {
            not: (x) => !x,
        };
        const registeredPartials = {};
        const registerHelper = (name, f) => (registeredHelpers[name] = f);
        const registerPartial = (name, template) =>
            (registeredPartials[name] = compileToStatements(template));
        const compile = (template) => {
            const statements = compileToStatements(template);
            return (data, helpers = {}) => {
                const parts = [];
                const writer = (x) => parts.push(x);
                const context = {
                    d: { $: data }, // Data of context
                    g(key) {
                        // Get variable result
                        return this.d[key] ?? helpers[key] ?? registeredHelpers[key] ?? this.d.$[key];
                    },
                    s(name, val) {
                        // Set variable
                        this.d[name] = val;
                    },
                    gd(name) {
                        // Get direct
                        return this.d[name];
                    },
                    r(data) {
                        // Replace variable
                        const old = this.d;
                        this.d = { $: data };
                        return old;
                    },
                    sd(data) {
                        // Set the entire context data
                        this.d = data;
                    },
                };
                runStatements(writer, context, statements);
                return parts.join('');
            };
        };
        const compileToStatements = (template) => {
            const statements = [];
            let end = 0;
            let statement;
            while (end < template.length) {
                [statement, end] = getStatement(template, end);
                if (statement === null) err('Unexpected end token');
                if (statement !== undefined) statements.push(statement);
            }
            return statements;
        };
        const getStatement = (template, start) => {
            if (start == template.length) err('Expected {{end}} but not found');
            const i = template.indexOf('{{', start);
            if (i == start) {
                if (template[i + 2] === '/' && template[i + 3] === '*') {
                    // handle comment
                    const commentEnd = template.indexOf('*/}}', i + 4);
                    return [undefined, commentEnd + 4]; // Return undefined for comment
                }
                if (template[i + 2] === '>') {
                    // handle partial here
                    const [tokens, end] = getTokens(template, i + 3);
                    const templateName = tokens[0];
                    if (!templateName) err('Template name not specified');
                    const expr = getExpression(tokens, 1);
                    const statement = (writer, context) => {
                        const partialStatements = registeredPartials[templateName];
                        if (!partialStatements) err(`Partial not registered: ${templateName}`);
                        const newData = expr(context);
                        const oldData = context.r(newData);
                        runStatements(writer, context, partialStatements);
                        context.sd(oldData);
                    };
                    return [statement, end];
                }
                let [tokens, end] = getTokens(template, i + 2);
                const first = tokens[0];
                if (first === 'for') {
                    let loopType = tokens[2];
                    if (loopType !== 'in') {
                        const inIndex = tokens.indexOf('in');
                        if (inIndex > 2) {
                            tokens = mergeTokens(tokens, inIndex);
                            loopType = tokens[2];
                        } else err('Missing "in" in for-loop');
                    }
                    const [t1, t2] = tokens[1].split(',');
                    const loopValuesExpr = getExpression(tokens, 3);
                    let statements;
                    [statements, end] = getInnerStatements(template, end);
                    const forStatement = (writer, context) => {
                        const loopValues = loopValuesExpr(context);
                        if (loopValues == null)
                            err(`Value of '${tokens.slice(3).join(' ')}' was not iterable`);
                        const t1Old = context.gd(t1);
                        const t2Old = context.gd(t2);
                        if (isIterable(loopValues)) {
                            let i = 0;
                            for (const val of loopValues) {
                                context.s(t1, val);
                                if (t2) context.s(t2, i);
                                runStatements(writer, context, statements);
                                i++;
                            }
                        } else {
                            for (const key in loopValues) {
                                context.s(t2, key);
                                context.s(t1, loopValues[key]);
                                runStatements(writer, context, statements);
                            }
                        }
                        context.s(t1, t1Old);
                        context.s(t2, t2Old);
                    };
                    return [forStatement, end];
                } else if (first === 'if') {
                    const ifExpr = getExpression(tokens, 1);
                    let ifStatements = [];
                    let elseStatements = [];
                    let elseIfGroups = [];
                    let nextType;
                    let statement;
                    while (true) {
                        nextType = getNextStatementType(template, end);
                        if (nextType === 'else') {
                            break;
                        }
                        if (nextType === 'end') {
                            [statement, end] = getStatement(template, end); // Read {{end}}
                            const ifStatement = (writer, context) => {
                                if (ifExpr(context)) runStatements(writer, context, ifStatements);
                            };
                            return [ifStatement, end];
                        } else {
                            [statement, end] = getStatement(template, end);
                            ifStatements.push(statement);
                        }
                    }

                    const createIfStatement = () => (writer, context) => {
                        if (ifExpr(context)) {
                            runStatements(writer, context, ifStatements);
                            return;
                        }
                        for (const [expr, statements] of elseIfGroups) {
                            if (expr(context)) {
                                runStatements(writer, context, statements);
                                return;
                            }
                        }
                        runStatements(writer, context, elseStatements);
                    };
                    // Has else here as the next type
                    while (true) {
                        [tokens, end] = getTokens(template, end + 2);
                        if (tokens.length == 1) {
                            while (true) {
                                [statement, end] = getStatement(template, end);
                                if (!statement) break;
                                elseStatements.push(statement);
                            }
                            const ifStatement = createIfStatement();
                            return [ifStatement, end];
                        }
                        // Else-if here
                        if (tokens[1] !== 'if') err('if missing from else-if statement');
                        let elseIfExpr = getExpression(tokens, 2);
                        let elseIfStatements = [];
                        while (true) {
                            nextType = getNextStatementType(template, end);
                            if (nextType === 'else') {
                                elseIfGroups.push([elseIfExpr, elseIfStatements]);
                                break;
                            }
                            if (nextType == null) {
                                [statement, end] = getStatement(template, end);
                                elseIfStatements.push(statement);
                                continue;
                            } else if (nextType === 'end') {
                                elseIfGroups.push([elseIfExpr, elseIfStatements]);
                                [statement, end] = getStatement(template, end); // Read {{end}}
                                const ifStatement = createIfStatement();
                                return [ifStatement, end];
                            }
                            err('Tag not closed with }}');
                        }
                    }
                } else if (first === 'end') {
                    return [null, end]; // Return null for {{end}}
                } else if (first === 'else') {
                    err('Unexpected else token');
                } else if (first === 'set') {
                    const varName = tokens[1];
                    const expr = getExpression(tokens, 2);
                    const statement = (writer, context) => context.s(varName, expr(context));
                    return [statement, end];
                }
                // Get expression as statement
                const expr = getExpression(tokens, 0);
                const stmt = (writer, context) => writer(htmlEncode(expr(context)));
                return [stmt, end];
            } else if (i < 0) {
                return [template.substring(start), template.length];
            } else {
                return [template.substring(start, i), i];
            }
        };
        const getInnerStatements = (template, end) => {
            const statements = [];
            let statement;
            while (true) {
                [statement, end] = getStatement(template, end);
                if (statement === null) break;
                if (statement !== undefined) statements.push(statement);
            }
            return [statements, end];
        };
        const getNextStatementType = (template, start) => {
            if (start + 1 < template.length && template[start] === '{' && template[start + 1] === '{') {
                start += 2;
                while (template[start] === ' ') start++;
                const tempStart = start++;
                while (start < template.length && template[start] !== '}' && template[start] !== ' ')
                    start++;
                return template.substring(tempStart, start);
            }
            return null;
        };
        const getTokens = (template, i) => {
            const tokens = [];
            while (true) {
                while (template[i] === ' ') i++;
                if (template[i] === '}' && template[i + 1] === '}') return [tokens, i + 2];
                if (template[i] === '|') {
                    tokens.push('|');
                    i++;
                    continue;
                }
                const start = i++;
                let c = template[start];
                if (c === '"' || c === "'") {
                    // Read string literal
                    while (i < template.length && template[i] !== c) i++;
                    if (i == template.length) err('String not closed');
                    i++;
                } else {
                    // Read variable name or keyword
                    while (i < template.length && (c = template[i]) !== '}' && c !== ' ' && c !== '|') {
                        if (c == "'" || c == '"') err(`Unexpected character: ${c}`);
                        i++;
                    }
                }

                const token = template.substring(start, i);
                if (!token) err('Tag not closed with }}');
                tokens.push(token);
            }
        };
        const getExpression = (tokens, start) => {
            if (tokens.length - start == 0 || tokens[start] === '.') {
                if (tokens.length == 0) err('Expression cannot be empty');
                else err(`Expression expected after: ${tokens.slice(0, start).join(' ')}`);
            }
            const pipeIndex = tokens.findIndex((x, i) => i >= start && x === '|');
            const end = pipeIndex >= 0 ? pipeIndex : tokens.length;
            let firstExpr;
            if (end - start == 1) {
                firstExpr = getTokenAsExpression(tokens[start]);
            } else {
                const f = tokens[start];
                assertFunction(f);
                const argGroups = getArgGroups(tokens, start + 1);
                if (argGroups.length == 1) {
                    const expr = argGroups[0];
                    return (context) => {
                        const func = getFunc(f, context);
                        return func(expr(context));
                    };
                }
                firstExpr = (context) => {
                    const func = getFunc(f, context);
                    const args = argGroups.map((expr) => expr(context));
                    return func.apply(null, args);
                };
            }
            if (pipeIndex < 0) return firstExpr;
            const pipeExprs = [];
            let end2 = pipeIndex;
            let pipeTokens;
            while (end2 != tokens.length) {
                [pipeTokens, end2] = getPipeTokens(tokens, end2 + 1);
                const [f, ...argTokens] = pipeTokens;
                assertFunction(f);
                if (argTokens.length > 0) {
                    const argExprs = argTokens.map(getTokenAsExpression);
                    pipeExprs.push((lastValue, context) => {
                        const func = getFunc(f, context);
                        const args = argExprs.map((expr) => expr(context));
                        return func(lastValue, ...args);
                    });
                } else {
                    pipeExprs.push((lastValue, context) => {
                        const func = getFunc(f, context);
                        return func(lastValue);
                    });
                }
            }
            return (context) => {
                let lastValue = firstExpr(context);
                for (const pipeExpr of pipeExprs) {
                    lastValue = pipeExpr(lastValue, context);
                }
                return lastValue;
            };
        };
        const getTokenAsExpression = (token) => {
            const expr = getTokenAsExpressionInner(token);
            return (context) => {
                try {
                    return expr(context);
                } catch (e) {
                    err(`Error while resolving: ${token}`);
                }
            };
        };
        const getTokenAsExpressionInner = (token) => {
            if (token === 'true') return (context) => true;
            if (token === 'false') return (context) => false;
            if (token === 'null') return (context) => null;
            if (token === 'undefined') return (context) => undefined;
            const parsedNumber = Number(token);
            if (!isNaN(parsedNumber)) return (context) => parsedNumber;
            if (token[0] == '"' || token[0] == "'") {
                const text = token.substring(1, token.length - 1);
                return (context) => text;
            }
            const subTokens = token.split('.');
            for (const x of subTokens) {
                if (!x) err(`Invalid member access expression: ${token}`);
            }
            const t = subTokens[0];
            if (subTokens.length == 1) {
                return (context) => context.g(t);
            }
            if (subTokens.length == 2) {
                const k = subTokens[1];
                return (context) => context.g(t)[k];
            }
            if (subTokens.length == 3) {
                const k1 = subTokens[1];
                const k2 = subTokens[2];
                return (context) => context.g(t)[k1][k2];
            }
            return (context) => {
                let o = context.g(t);
                for (let i = 1; i < subTokens.length; i++) o = o[subTokens[i]];
                return o;
            };
        };
        const getArgGroups = (tokens, index) => {
            const expressions = [];
            while (index < tokens.length) expressions.push(getTokenAsExpression(tokens[index++]));
            return expressions;
        };
        const getPipeTokens = (tokens, i) => {
            const tok = [];
            for (; i < tokens.length; i++) {
                if (tokens[i] === '|') return [tok, i];
                tok.push(tokens[i]);
            }
            return [tok, i];
        };
        const getFunc = (f, context) => {
            const func = context.g(f);
            if (typeof func !== 'function') err(`value of ${f} was not a function`);
            return func;
        };
        const mergeTokens = (tokens, inIndex) => [
            tokens[0],
            tokens.slice(1, inIndex).join(''),
            ...tokens.slice(inIndex),
        ];
        const runStatements = (writer, context, statements) => {
            for (const stmt of statements)
                if (typeof stmt === 'string') writer(stmt);
                else stmt(writer, context);
        };
        const htmlEncode = (s) => {
            s = String(s ?? '');
            return /[&<>\'\"]/.test(s)
                ? s
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/'/g, '&#39;')
                      .replace(/"/g, '&#34;')
                : s;
        };
        const isIterable = (obj) => {
            if (obj == null) return false;
            return typeof obj[Symbol.iterator] === 'function';
        };
        const assertFunction = (f) => {
            if (f.includes('.')) err(`Function name cannot contain a dot character: ${f}`);
        };
        const err = (msg) => {
            throw new Error(msg);
        };
        return { compile, registerHelper, registerPartial };
    })();
    return Vancat;
});
