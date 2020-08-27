---
type: reference
name: Reference
---

A **reference** is a pointer to a value that exists somewhere else.
The main reference type in this game is the **list**.

If you have a reference to a list, then you can modify the list that the
reference points to using functions such as `set`.

```javascript
__let(myList, [3, 4], () => __tuple(set(myList, 0, 1)))
```

```javascript
__let(myList, [3, 4], () => __tuple(set(__reference([3, 4]), 0, 1), get(myList, 0)))
```

```javascript
__let(myList, [1, 4], () => __tuple(__reference([1, 4]), get(myList(0))))
```

When `set` is reduced, it will actually modify the list `myList`, instead of
creating a new list.
