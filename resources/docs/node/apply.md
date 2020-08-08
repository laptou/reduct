---
type: apply
name: Apply
example: 'x => x ()'
---

The **apply** represents a function, and an argument that is passed to,
or "applied" to that function.

```javascript
(number => number)(1)
```
The value it returns can be composed of almost any other nodes. For example, a
boolean.

```javascript
(boolean => boolean)(true)
```

Or a [conditional](nodes/conditional):

```javascript
(x => x > 1 ? 'big number' : 'little number' )(x)
```