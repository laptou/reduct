---
type: array
name: List
example: '[STAR, RECT, TRIANGLE]'
---

An **list** is a list of items.

```javascript
[1,2,3]
```

Lists can contain anything, or nothing. Their elements don't have to have the
same type.

```javascript
[[], STAR, (x => x + 1)(3)]
```
```javascript
[]
```

If you step an identifier that points to a list, you will get a **reference** to the
list.

```javascript
__reference([1, 3, 4])
```
