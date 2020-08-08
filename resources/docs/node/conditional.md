---
type: conditional
name: Conditional
example: ' 1 == 2 ? 5 : 6'
---

The **conditional** represents an if-else block. This block contains a
condition, positive, and negative block. If the condition is met, the positive
block is executed. If not, the negative block is executed.

```javascript
1 == 2 ? 5 : 6
```

Note: The conditional block is evaluated to a boolean, and
therefore booleans themselves
may be supplanted as a condition.

```javascript
true ? 3 : 2
```