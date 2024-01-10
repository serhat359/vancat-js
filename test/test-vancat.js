import Vancat from '../vancat.mjs';

const { compile } = Vancat;

var tests = [
    ['', {}, ''],
    ['hello world', {}, 'hello world'],
];

for (const [template, data, expected] of tests) {
    const renderer = compile(template);
    const result = renderer(data);
    if (result !== expected) throw new Error();
}

console.log('SUCCESS!!!');
