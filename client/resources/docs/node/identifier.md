---
type: identifier
name: Identifier
example: identifier.png
---

An **identifier** is a name that points to something else. When you try to
reduce it, it will resolve to the value with that name in the current scope.

```javascript
x
```
```javascript
lenny
```

Functions and `let` nodes have their own scope. Use these to set the value that
the identifier will resolve to.

```javascript
(x => 5 + x)(3)
```
```javascript
__let(x, 3, () => 5 + x)
```
