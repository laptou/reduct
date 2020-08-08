---
type: let
name: Let
example: '__let(x, _, () => x + x)'
---

The **let** expression has an identifier, a value, and a body expression. During
execution, the value is bound to the identifier, and then the body expression is
evaluated with all cases of the identifier being evaluated to the value to which
it was bound.

```javascript
__let(x, _, () => x + x)
```

For example. let expressions can bind variables to be used in conditional
expressions
```javascript
__let(x, _, () => x < 0 ? 'negative' : 'posiitve')
```

Note: the body expression could be any expression, not necessarily just one that
contains the indentifier.

```javascript
__let(x, _, () => true)
```