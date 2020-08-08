---
type: identifier
name: Identifier
example: 'x'
---

An **identifier** is simply a character or string of characters that points to a
value. An identifier could point to any value. When used in functions and other
expressions, identifiers will always evaluate to the value to which they are
bound, unless they are rebound to another value. See [let](nodes/let).

Here, x is an identifier that, during program execution, will evaluate to
whatever value it has been bound.

```javascript
x
```

We can bind x to the integer 5 using a let expression.

```javascript
__let(x, 5, () => 5 + x)
```