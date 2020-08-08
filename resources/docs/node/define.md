---
type: define
name: Define
example: 'function identity(x) {return x;}'
---

A **define** represents the defenition of a new function. A new fucntion has 
a name, zero or more arguments, and returns some value, based on the function
body.

Here, we have the defenition of the identity function, or the function that 
simply returns that which its given.

```javascript
function identity(x) { return x; }
```

Functions can also be defined to take multiple arguments, such as the following
one.

```javascript
function add(x, y) { return x + y; }
```

Some fucntions will always return the same thing, no matter the argument.

```javascript
function AlwaysBlue(x) { return blue  ; }
```