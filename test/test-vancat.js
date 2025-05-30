import Vancat from '../vancat.js';

var usersData = {
    id: -1,
    username: 'should not display',
    users: [
        { id: 1, username: 'user1', numbers: [1, 2, 3] },
        { id: 2, username: 'user2', numbers: [4, 5] },
    ],
};

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
    ['numbers: {{for x in num.inner}}{{x}},{{end}}', { num: { inner: [1, 2, 3] } }, 'numbers: 1,2,3,'],
    ['{{for e in num}}{{e.x}}{{end}}', { num: [{ x: 2 }, { x: 5 }, { x: 8 }] }, '258'],
    ['{{for e , i in num}}{{i}}{{end}}', { num: [{ x: 2 }, { x: 5 }, { x: 8 }] }, '012'],
    ['{{for e in $}}{{e}}{{end}}', [2, 5, 8], '258'],
    [
        '{{for x in texts}}<{{x}}>{{end}}',
        { texts: ['foo', 'bar', 'baz', '<script>'] },
        '<foo><bar><baz><&lt;script&gt;>',
    ],
    ['the number is {{if b}}there{{end}}', { b: 2 }, 'the number is there'],
    ['the number is {{if b}}there{{else}}NOT there{{end}}', { b: 0 }, 'the number is NOT there'],
    ['the number is {{if b}}there{{else if y}}up there{{end}}', { y: 5 }, 'the number is up there'],
    [
        'the number is {{if b}}there{{else if y}}up there{{else if x}}down there{{end}}',
        { y: 0, x: 5 },
        'the number is down there',
    ],
    [
        'the number is {{if b}}there{{else if y}}up there{{else if x}}down there{{else}}on left{{end}}',
        { y: 0, x: 0 },
        'the number is on left',
    ],
    ['{{if arr.length}}{{for a in arr}}x{{end}}{{end}}', { arr: [1] }, 'x'],
    [
        '{{if arr.length}}{{for a in arr}}{{end}}{{else}}No record found{{end}}',
        { arr: [] },
        'No record found',
    ],
    ['{{if isPos a.b}}YES{{else}}NO{{end}}', { a: { b: 2.762736723 } }, 'YES'],
    ['{{if x}}{{end}}{{x}}', { x: 2 }, '2'],
    ['{{if gt $.v1 $.v2}}YES{{end}}', { v1: 6, v2: 3 }, 'YES'],
    ['{{if x}} {{else if x}}  {{end}}    {{x}}', { x: 2 }, '     2'],
    ['{{if x}} {{else if y}}  {{end}}    {{y}}', { x: 0, y: 2 }, '      2'],
    ['{{if x}} {{else}}  {{end}}    {{y}}', { x: 0, y: 2 }, '      2'],
    ['{{if gt x 2}}more than two{{end}}', { x: 4 }, 'more than two'],
    ['{{if lt x 2}}less than two{{end}}', { x: 1 }, 'less than two'],
    ['{{sum $.n $.n $.n $.n}}', { n: 25 }, '100'],
    ['{{for x in $}}{{1.5}},{{end}}', ['', '', '', ''], '1.5,1.5,1.5,1.5,'],
    ['{{for v,k in $}}{{k}}:{{v}},{{end}}', { name: 'Jack', age: 25 }, 'name:Jack,age:25,'],
    ['{{for x in $}}{{x}},{{end}}', testGenerator(), '1,2,3,'],
    ['{{for e in $}}{{set k fixed e}}{{k}},{{end}}', [1, 2, 3], '1.00,2.00,3.00,'],
    ["{{if not data}}It's not{{else}}it is{{end}}", { data: false }, "It's not"],
    [
        '{{id}},{{for x in users}}{{>user x}},{{end}}::{{id}}::{{$.username}}',
        usersData,
        '-1,1 user1:123,2 user2:45,::-1::should not display',
    ],
    ['{{>user $.user}}', { id: -1, user: { numbers: [] } }, ' :'],
    ['{{for x in inner}}{{x}},{{end}}:{{x}}', { inner: [1, 2, 3], x: 10 }, '1,2,3,:10'],
    ['{{for v,k in inner}}{{end}}{{k}}', { inner: { prop: 2 }, prop: 10 }, ''],
    ['{{for v,prop in inner}}{{end}}{{prop}}', { inner: { prop: 2 }, prop: 10 }, '10'],
    ['{{add x -2.5}}', { x: -1 }, '-3.5'],
    ['{{/**/}}', { '/**/': 2 }, ''],
    ['  {{/**/}}', {}, '  '],
    ['  {{/**/}}  ', {}, '    '],
    ['{{for x in $}} {{/* this is a comment*/}}{{end}}', [1, 2], '  '],
    ['{{for x in $}}{{/* this is a comment*/}} {{end}}', [1, 2], '  '],
    ['{{for x in $}} {{/* this is a comment*/}} {{end}}', [1, 2], '    '],
    ['{{w|upper}}', { w: 'world' }, 'WORLD'],
    ['{{w | upper}}', { w: 'world' }, 'WORLD'],
    ['hello {{w|upper}}', { w: 'world' }, 'hello WORLD'],
    ['hello {{w|upper|upper}}', { w: 'world' }, 'hello WORLD'],
    ['hello {{upper w|upper|lower}}', { w: 'world' }, 'hello world'],
    ['hello {{upper w|upper 1 0 |lower 1 0}}', { w: 'world' }, 'hello world'],
    ['{{x|fixed}}', { x: 2 }, '2.00'],
    ['{{5|fixed}}', { x: 2 }, '5.00'],
    ['{{index arr 1|fixedN 3}}', { arr: [3, 4, 5] }, '4.000'],
    ['{{index arr 1|fixedN 3|comma}}', { arr: [3, 4, 5] }, '4,000'],
    ['{{index arr 1 | fixedN 3 | comma}}', { arr: [3, 4, 5] }, '4,000'],
    ['{{ret ""}}', {}, ''],
    ["{{ret ''}}", {}, ''],
    ['{{ret "hello world"}}', {}, 'hello world'],
    ["{{ret 'hello world'}}", {}, 'hello world'],
    ['{{for x in $}}{{eq x "bar"}} {{end}}', ['foo', 'bar', 'baz'], 'false true false '],
    ['{{concat "s1 s2" "s3 s4"}}', {}, 's1 s2s3 s4'],
    ["{{concat 's1 s2' 's3 s4'}}", {}, 's1 s2s3 s4'],
    ['{{concat \'s1 s2\' "s3 s4"}}', {}, 's1 s2s3 s4'],
    ['{{true}}', {}, 'true'],
    ['{{false}}', {}, 'false'],
    ['{{null}}', {}, ''],
    ['{{undefined}}', {}, ''],
    ['{{for x in items}},{{x}}{{end}}', { x: 10, items: [1, 2, null] }, ',1,2,'],
];

Vancat.registerPartial('user', '{{id}} {{username}}:{{for x in numbers}}{{x}}{{end}}');

var helpers = {
    upper: function (s) {
        return s.toUpperCase();
    },
    lower: function (s) {
        return s.toLowerCase();
    },
    fixed: function (x) {
        return x.toFixed(2);
    },
    fixedN: function (x, n) {
        return x.toFixed(n);
    },
    add: function (x, y) {
        return x + y;
    },
    isPos: function (d) {
        return d > 0;
    },
    eq: function (o1, o2) {
        return o1 === o2;
    },
    gt: function (o1, o2) {
        return o1 > o2;
    },
    lt: function (o1, o2) {
        return o1 < o2;
    },
    sum: function (...args) {
        let total = 0;
        for (const arg of args) total += arg;
        return total;
    },
    index: function (arr, i) {
        return arr[i];
    },
    comma: function (s) {
        return s.replaceAll('.', ',');
    },
    ret: function (v) {
        return v;
    },
    concat: function (s1, s2) {
        return s1 + s2;
    },
};

for (const [template, data, expected] of tests) {
    const renderer = Vancat.compile(template);
    const result = renderer(data, helpers);
    if (result !== expected) {
        throw new Error();
    }
}

var badCompileTests = [
    '{{',
    '{{}}',
    '{{x.}}',
    '{{x.x.}}',
    '{{.x}}',
    '{{.x.x}}',
    '{{x.x x.x}}',
    '{{if}}',
    '{{else',
    '{{end',
    '{{if x}}',
    '{{if}}{{end}}',
    '{{if x}}{{}}',
    '{{if x}}}}',
    '{{if x}}{{',
    '{{if x}}{{else',
    '{{if x}}{{else}}',
    '{{if x}}   {{else}}    ',
    '{{if x}}{{else if',
    '{{if x}}{{else if}}',
    '{{if x}}{{else if x}}',
    '{{if x}}{{else if x}} {{',
    '{{if x}}{{else if x}} {{end',
    '{{if x}}{{end',
    '{{for}}',
    '{{for x}}',
    '{{for x in }}',
    '{{for x range }}',
    '{{for in }}',
    '{{for x in k}}',
    '{{for in k}}',
    '{{end}}',
    '{{else}}',
    '{{else if}}',
    '{{if $}}{{',
    '{{if $}}{{end}}{{',
    '{{if $}}{{end}}{{else',
    '{{>}}',
    '{{>none}}',
    '{{"}}',
    '{{"hello}}',
    "{{'}}",
    "{{'hello}}",
    "{{hello'}}",
    '{{hello"}}',
];

for (let k of badCompileTests) {
    try {
        Vancat.compile(k);
    } catch (e) {
        continue;
    }
    throw new Error(`${k} should have thrown error`);
}

var badRuntimeTests = [
    ['{{x.data.a.a}}', {}],
    ['{{for x in data}}{{end}}', null],
    ['{{for x in data}}{{end}}', { data: null }],
    ['{{>none 2}}', {}],
];
for (let [template, data] of badRuntimeTests) {
    var renderer = Vancat.compile(template);
    try {
        renderer(data);
    } catch (e) {
        continue;
    }
    throw new Error(`${template} should have thrown error`);
}

function* testGenerator() {
    yield 1;
    yield 2;
    yield 3;
}

console.log('SUCCESS!!!');
