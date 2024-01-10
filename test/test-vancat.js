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
];

var helpers = {
    upper: function (s) {
        return s.toUpperCase();
    },
};

for (const [template, data, expected] of tests) {
    const renderer = compile(template);
    const result = renderer(data, helpers);
    if (result !== expected) throw new Error();
}

console.log('SUCCESS!!!');
