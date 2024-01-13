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
                if (!statement) err('Unexpected end token');
                statements.push(statement);
            }
            return statements;
        };
        const getStatement = (template, start) => {
            if (start == template.length) err('Expected {{end}} but not found');
            const i = template.indexOf('{{', start);
            if (i == start) {
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
                        end = skipWhiteSpace(template, end);
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
                            end = skipWhiteSpace(template, end);
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
                    return [null, end];
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
                if (!statement) break;
                statements.push(statement);
            }
            return [statements, end];
        };
        const getNextStatementType = (template, start) => {
            start = skipWhiteSpace(template, start);
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
        const skipWhiteSpace = (template, start) => {
            while (start < template.length && /\s/.test(template[start])) start++;
            return start;
        };
        const getTokens = (template, i) => {
            const tokens = [];
            while (true) {
                while (template[i] === ' ') i++;
                if (template[i] === '}' && template[i + 1] === '}') return [tokens, i + 2];
                const start = i++;
                while (i < template.length && template[i] !== '}' && template[i] !== ' ') i++;
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
            if (tokens.length - start == 1) return getTokenAsExpression(tokens[start]);
            const f = tokens[start];
            if (f.includes('.')) err(`Function name cannot contain a dot character: ${f}`);
            const argGroups = getArgGroups(tokens, start + 1);
            if (argGroups.length == 1) {
                const expr = argGroups[0];
                return (context) => {
                    const func = getFunc(f, context);
                    return func(expr(context));
                };
            }
            return (context) => {
                const func = getFunc(f, context);
                const args = argGroups.map((expr) => expr(context));
                return func.apply(null, args);
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
            const parsedNumber = Number(token);
            if (!isNaN(parsedNumber)) return (context) => parsedNumber;
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
        const err = (msg) => {
            throw new Error(msg);
        };
        return { compile, registerHelper, registerPartial };
    })();
    return Vancat;
});
