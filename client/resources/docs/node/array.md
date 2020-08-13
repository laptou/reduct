---
type: array
name: Array
example: '[STAR, RECT, TRIANGLE]'
---

An **array** is a list of items.

```javascript
[1,2,3]
```

Arrays can contain anything, or nothing. Their elements don't have to have the
same type.

```javascript
[[], STAR, (x => x + 1)(3)]
```
```javascript
[]
```

Unlike numbers or strings, arrays are passed _by reference_, which means that
passing an array to a function and modifying it will change the original array.
