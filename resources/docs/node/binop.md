---
type: binop
name: Binary Operator
example: '3 + 2'
---

The **binary** operator node is used for math, comparison, and logic. You can
use it to add and subtract:

```javascript
__tuple(
  3 + 2,
  6 - 4
)
```

You can use it to compare two numbers:

```javascript
__tuple(
  3 > 2,
  6 < 6
)
```

You can use it to check if two things are equal (not just numbers!):

```javascript
__tuple(
  'egg' == 'not egg',
  3 == 3
)
```

And you can use it to perform logic with [booleans](node/boolean):

```javascript
__tuple(
  true || false,
  true && false
)
```
