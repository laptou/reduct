---
type: apply
name: Applier
example: apply.png
---

An **applier** passes a parameter to a function.

```javascript
(number => number)(1)
```

The left hand side can be as complex as you want, as long as it still reduces to a function.

```javascript
(boolean => boolean)(true)
```
```javascript
(x => x > 1 ? 'big number' : 'little number')(3 + 1)
```
```javascript
(true ? (x => x + 1) : (y => y - 1))(4)
```

And sometimes you can pass multiple parameters:

```javascript
((x, y) => x + y)(3, 2)
```
