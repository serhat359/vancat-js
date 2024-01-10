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
        if (i < 0) {
            return [template.substring(start), template.length];
        } else {
            return [template.substring(start, i), i];
        }
    };
    const runStatements = (writer, context, statements) => {
        for (const stmt of statements)
            if (typeof stmt === 'string') writer(stmt);
            else stmt(writer, context);
    };
    return { compile };
})();
export default Vancat;
