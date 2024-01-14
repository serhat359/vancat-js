# Vancat JS

Vancat is a fast and really small templating engine (only 4 KiB minified!). It's main purpose is generating HTML for client side rendering in browsers.

# Example

```js
var template = "{{fname}} {{lname}}"
var renderer = Vancat.compile(template)
var data = {
  fname: "John",
  lname: "Doe",
}
var result = renderer(data)
console.log(result) // Outputs 'John Doe'
```

# Example in a Webpage

```html
<div id="target"></div>

<script id="template" type="text/template">
  <ul>
    {{for x in data}}
      <li>{{x}}</li>
    {{end}}
  </ul>
</script>

<script src="https://unpkg.com/vancat@latest/vancat.min.js"></script>
<script type="text/javascript">
  addEventListener("load", () => { // Run the code when the page is loaded
    var template = document.getElementById("template").innerHTML;
    var renderer = Vancat.compile(template);
    var result = renderer({ data: ["foo", "bar", "baz"] });
    document.getElementById("target").innerHTML = result;
  });
</script>
```

This code renders the HTML below and sets it to #target in the page:
```html
<ul>
  <li>foo</li>
  <li>bar</li>
  <li>baz</li>
</ul>
```

Values are always HTML escaped before being appended to the result text.

# Features

## Formatting Data

Vancat allows you to define functions which convert data before generating the result.

Here's an example:

```js
var template = "{{name}}'s current balance is {{fixed2 balance}}"
var renderer = Vancat.compile(template)
var data = {
  name: "John",
  balance: 14.78347993477834,
}
var helpers = {
  fixed2: (x) => {
    return x.toFixed(2);
  }
}
var result = renderer(data, helpers)
console.log(result) // Outputs "John's current balance is 14.78"
```

## Expressions

### Variable

Variables are created whenever any `for` loop or `set` directive is used. `$` variable can be used to access the object `renderer` function is called with.

Examples:
```
{{x}}
{{x.length}}
{{x.data.length}}
{{$}}
{{$.length}}
```

### Function call

If the expression contains multiple variable-like parts separated by spaces then it will execute a function call. The functions can be supplied in a plain object by setting the second argument for the `renderer` function. Functions require at least one argument, otherwise the templating engine thinks it's a variable.

Examples:
```
{{format x}}    // Function calls can be used in places for <expression>
{{format $}}
{{format x 2}}
{{call x -2.5}}
{{call arg0 arg1 arg2 arg3 ... and so on}}
```

## Statements

### If and If-Else

Traditional `if`, `else-if` and `else` statements are all suppored. Body of an if statement is executed if the value from the `<expression>` is [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy).

Syntax:

```
// if with no else
{{if <expression>}}
 ...
{{end}}

// if with else
{{if <expression>}}
 ...
{{else}}
 ...
{{end}}

// if with else if and else
{{if <expression>}}
 ...
{{else if <expression>}}
 ...
{{else}}
 ...
{{end}}
```

### For loop (iterating over array)

Syntax:

```
{{for x in <expression>}}
  // use x here
{{end}}
```

### For loop with index (iterating over array)

Syntax:

```
{{for x,i in <expression>}}
  // i will be the index of the element
{{end}}
```

### For loop (iterating over object)

Syntax:

```
{{for value,key in <expression>}}
  // this loop is the equivalent of for-in loops in JavaScript
{{end}}
```

### Set

Set allows you to define a variable and set a value to it.

Syntax:

```
{{set <varName> <expression>}}
```

Example:
```
{{set val index data i}}   // Calls `index` function with the args `data` and `i` and sets the result to `val`

{{val}}
```

`index` is not a pre-defined function but you can easily define it as `Vancat.registerHelper("index", (data, i) => data[i])`

The variables created this way will keep their data until the end of renderering.

### Comments

Syntax:

```
{{/* This is a comment and will not be rendered or executed */}}
```

## Helper Functions

You can define functions that allow you to either format data or help you write complex expressions such as equality checking or comparison.

One way of using helper functions is putting the functions in an object and passing it to the `renderer` function as the second argument.

Example:
```js
// prepare data before this point

var helpers = {
  isnull: (x) => x == null,
  isnotnull: (x) => x != null,
  gt: (x,y) => x > y,
  eq: (x,y) => x === y,
  sum: (...args) => { let sum = 0; for (const x of args) sum += x; return sum; },
}
var result = renderer(data, helpers)
```

Another way is registering helper function directly.

Example:
```js
Vancat.registerHelper("isnull", x => {
  return x == null
})
Vancat.registerHelper("gt", (x,y) => {
  return x > y
})

var result = renderer(data)
```

## Partials

Parts of a template that are specified multiple times can be extracted into a partial template. You can do so by first registering the partial with `Vancat.registerPartial` function. After this you can call the partial just like a function call but with `>` characted before it.

Example:
```js
Vancat.registerPartial("list", 
`<ul class="list-group">
  {{for x in $}}
    <li class="list-group-item">{{x}}</li>
  {{end}}
</ul>`)

var data = {
  successful: ["hello", "world"],
  failed: ["foo-", "b-ar", "-baz"],
}

var template = 
`<span>Successful items:</span>
{{>list successful}}
<span>Failed items:</span>
{{>list failed}}`

var renderer = Vancat.compile(template)
var result = renderer(data)
```

This code renders the HTML below:

```html
<span>Successful items:</span>
<ul class="list-group">
  <li class="list-group-item">hello</li>
  <li class="list-group-item">world</li>
</ul>
<span>Failed items:</span>
<ul class="list-group">
  <li class="list-group-item">foo-</li>
  <li class="list-group-item">b-ar</li>
  <li class="list-group-item">-baz</li>
</ul>
```

Syntax for calling partial:

```
{{>templateName <expression>}}  // Expression should not contain (<) or (>) characters
```

# Common Use Cases

## Rendering like String.join

Template: 
```
{{for x,i in items}}
  {{if i}}
  <div class="divider"></div>
  {{end}}
  <div>{{x}}</div>
{{end}}
```

Data:
```js
var data = {
  items: ["foo","bar","baz"],
}
```

Output:
```html
<div>foo</div>
<div class="divider"></div>
<div>bar</div>
<div class="divider"></div>
<div>baz</div>
```

# Limitations

  * Raw HTML is currently not supported as I did not see the need for it.
  * Numbers are supported but other constant literals are not supported, so no `null`, `true`, `false`, `"text"`, etc.
  * Accessing loop index (`i`) when iterating over an object is currently not supported.