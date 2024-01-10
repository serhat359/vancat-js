import Vancat from '../vancat.mjs';

const { compile } = Vancat;

var tests = [
    ['', {}, ''],
    ['hello world', {}, 'hello world'],
    ['<script>', {}, '<script>'],
    ['hello {{w}}', { w: 'world' }, 'hello world'],
    ['hello {{w}}', { w: '<script>' }, 'hello &lt;script&gt;'],
    ['{{h}} {{w}}', { h: 'hello', w: 'world' }, 'hello world'],
    ['{{a.b}}', { a: { b: 'text' } }, 'text'],
    ['{{a.b.c}}', { a: { b: { c: 'text' } } }, 'text'],
    ['{{a.b.c.d}}', { a: { b: { c: { d: 'text' } } } }, 'text'],
    ['{{a.b.c.d.e}}', { a: { b: { c: { d: { e: 'text' } } } } }, 'text'],
    ['{{a.b.c.d.e.f}}', { a: { b: { c: { d: { e: { f: 'text' } } } } } }, 'text'],
    ['hello {{upper w}}', { w: 'world' }, 'hello WORLD'],
    ['numbers count: {{num.length}}', { num: [1, 2, 3] }, 'numbers count: 3'],
    ['numbers count: {{text.length}}', { text: 'hello world' }, 'numbers count: 11'],
    ['{{fixed number}}', { number: 2.762736723 }, '2.76'],
    ['{{fixed a.b}}', { a: { b: 2.762736723 } }, '2.76'],
];

var helpers = {
    upper: function (s) {
        return s.toUpperCase();
    },
    fixed: function (x) {
        return x.toFixed(2);
    },
};

for (const [template, data, expected] of tests) {
    const renderer = compile(template);
    const result = renderer(data, helpers);
    if (result !== expected) throw new Error();
}

var badCompileTests = ['{{', '{{}}', '{{x.}}', '{{x.x.}}', '{{.x}}', '{{.x.x}}', '{{x.x x.x}}'];

for (let k of badCompileTests) {
    try {
        Templater.compile(k);
    } catch (e) {
        continue;
    }
    throw new Error(`${k} should have thrown error`);
}

console.log('SUCCESS!!!');
