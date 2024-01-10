import Vancat from '../vancat.mjs';

const { compile } = Vancat;

var tests = [
    ['', {}, ''],
    ['hello world', {}, 'hello world'],
    ['<script>', {}, '<script>'],
    ['hello {{w}}', { w: 'world' }, 'hello world'],
    ['hello {{w}}', { w: '<script>' }, 'hello &lt;script&gt;'],
    ['{{h}} {{w}}', { h: 'hello', w: 'world' }, 'hello world'],
];

for (const [template, data, expected] of tests) {
    const renderer = compile(template);
    const result = renderer(data);
    if (result !== expected) throw new Error();
}

console.log('SUCCESS!!!');
