/*!
 * vancat.js - Fast and small templating engine
 * https://github.com/serhat359/vancat-js
 */

var Vancat = (function () {
    const compile = (template) => {
        const statements = [];
        let end = 0;
        let statement;
        while (end < template.length) {
            [statement, end] = getStatement(template, end);
            if (!statement) throw new Error('Unexpected end token');
            statements.push(statement);
        }
        return (data, helpers = {}) => {
            const parts = [];
            const writer = (x) => parts.push(x);
            const contextData = {};
            contextData['$'] = data;
            const context = {
                get(key) {
                    return contextData[key] ?? helpers[key] ?? data[key];
                },
                set(name, val) {
                    contextData[name] = val;
                },
            };
            runStatements(writer, context, statements);
            return parts.join('');
        };
    };
    const getStatement = (template, start) => {
        if (start == template.length) throw new Error('Expected {{end}} but not found');
        const i = template.indexOf('{{', start);
        if (i == start) {
            let [tokens, end] = getTokens(template, i + 2);
            const expr = getExpression(tokens, 0);
            const stmt = (writer, context) => writer(htmlEncode(expr(context)));
            return [stmt, end];
        } else if (i < 0) {
            return [template.substring(start), template.length];
        } else {
            return [template.substring(start, i), i];
        }
    };
    const getTokens = (template, i) => {
        const tokens = [];
        while (true) {
            while (template[i] === ' ') i++;
            if (template[i] === '}' && template[i + 1] === '}') return [tokens, i + 2];
            const start = i++;
            while (i < template.length && template[i] !== '}' && template[i] !== ' ') i++;
            const token = template.substring(start, i);
            if (!token) throw new Error('Tag not closed with }}');
            tokens.push(token);
        }
    };
    const getExpression = (tokens, start) => {
        if (tokens.length - start == 0 || tokens[start] === '.') {
            if (tokens.length == 0) throw new Error('Expression cannot be empty');
            else throw new Error(`Expression expected after: ${tokens.slice(0, start).join(' ')}`);
        }
        if (tokens.length - start == 1) return getTokenAsExpression(tokens[start]);
        throw new Error();
    };
    const getTokenAsExpression = (token) => {
        const subTokens = token.split('.');
        const t = subTokens[0];
        if (subTokens.length == 1) {
            return (context) => context.get(t);
        }
        throw new Error();
    };
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
    return { compile };
})();
export default Vancat;
