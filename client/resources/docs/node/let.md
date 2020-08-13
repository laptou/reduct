---
type: let
name: Let
example: '__let(x, 5, () => x + x)'
---

The **let** node lets you give a value to a name.

```javascript
__let(x, 5, () => x + x)
```

Inside of this `let` node's body, `x` will evaluate to `5`.

The body can be as complex or as simple as you want.

```javascript
__let(x, -4, () => x < 0 ? 'negative' : 'posiitve')
```
```javascript
__let(food, "egg", () => true)
```
