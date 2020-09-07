---
type: lambda
name: Lambda
example: lambda.png
---

The **lambda** represents a function. It takes in a parameter and returns a
value.

```javascript
parameter => true
```

The value it returns can be composed of almost any other nodes. For example,
the [binary operator](nodes/binop):

```javascript
j => j + 4
```

Or a conditional:
```javascript
x => x > 3 ? 'big number' : 'little number'
```

Or even another lambda:
```javascript
x => y => x + y
```
