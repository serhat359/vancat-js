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
{{format x}}
{{format $}}
{{format x 2}}
{{format arg0 arg1 arg2 arg3 ... and so on}}
```

## Statements

### If and If-Else

Traditional `if`, `else-if` and `else` statements are all suppored.

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
{{val}}
```

The variables created this way will keep their data until the end of renderering.

# More documentation will be added later

# Limitations

  * Raw HTML is currently not supported.
  * Numbers are supported but other constant literals are not supported, so no `null`, `true`, `false`, `"text"`, etc.
  * Indexing when iterating over an object is currently not supported.