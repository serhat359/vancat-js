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
    var result = renderer({ data: ["foo","bar","baz"] });
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

# Features

## Formatting Data

Vancat allows you to define functions which convert data before generating the result.

Here's an example

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
console.log(result) // Outputs 'John's current balance is 14.78'
```

# More documentation will be added later

# Limitations

  * Raw HTML is currently not supported
  * Numbers are supported but other constant literals are not supported, so no `null`, `true`, `false`, `"text"`, etc.
