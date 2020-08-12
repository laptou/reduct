# Design

If you are coming from the old version of Reduct, perhaps start with the section
at the bottom titled "Changes from the Old Version of Reduct".

## Vocabulary
- **node**: an item that represents an object or operation, such as a number or an addition.
- **projection**: the visual representation of a node.

## The Reducer

All of the logic in this game passes through the reducer. The game state is
managed almost entirely inside of Redux. Every action in the game is performed
via a Redux action which computes a new game state based on the old game state
and the action that was performed.

### The Node Map

Each node is assigned a globally unique ID upon creation. All of the nodes that
are currently in the game are stored in the [**node map**](https://github.coecis.cornell.edu/Reduct/reduct-redux/blob/a75fe31c08bc0c1c550a2391f1744032be0944d0/src/store/state.ts#L18-L22).

Nodes can have child nodes (also called **subexpressions**), which are stored in
the `subexpressions` field of a node object. Since deeply nested structures can
quickly become unwieldy, most of the code in this game handles nodes as
[`DRF`s](https://github.coecis.cornell.edu/Reduct/reduct-redux/blob/a75fe31c08bc0c1c550a2391f1744032be0944d0/src/util/helper.ts#L52)
(deeply read-only and flat nodes). This means that the node's `subexpressions`
is a map from names to node IDs, instead of a map from names to nodes.

### The Board, Toolbox, and More

The store contains a set called `board` which contains the IDs of all top-level
nodes that are currently on the board. Ditto for `toolbox`, `goal`, and
`globals` (which represents the "Definitions" section). The positions of the
nodes don't affect the game's logic, so they are not stored in Redux.

### Undo, Redo, and Error Handling

The [reducer for the game's logic](https://github.coecis.cornell.edu/Reduct/reduct-redux/blob/a75fe31c08bc0c1c550a2391f1744032be0944d0/src/store/reducer/game.ts#L58) is wrapped in [another reducer](https://github.coecis.cornell.edu/Reduct/reduct-redux/blob/a75fe31c08bc0c1c550a2391f1744032be0944d0/src/store/reducer/undo.ts#L37) which records the game's state after the user performs any action. This allows the user to undo and redo moves by sending actions to go to previous or subsequent game states.

This outer reducer also traps errors that are thrown, but only if they are
caused by user error (i.e., the player tried to call a lambda with itself as an
argument) and not by programmer error (i.e., a null reference exception).

# `src/gfx`, `src/stage`, `src/ui`

If these folders still exist, all you need to know is that they contain legacy
code which is not being used (and in fact, is not included in the final bundle
at all).

# Changes from the Old Version of Reduct

- Game is now written in TypeScript.
- Game is now rendered using React.
- Game is now bundled using Webpack.
- Game now has automatic crash logging via [Sentry](https://sentry.io).
- Game now has automatic user session monitoring via [DataDog](https://datadoghq.com).
- Almost all game logic is handled in the reducer via a Redux action. No more
  processing nodes in the stage code and then sending the result to Redux.
- Concreteness fading has been disabled (and there is no implementation for it
  in the new GUI). It was only used in one part of the game, and had the
  confusing effect of changing the game's mechanics halfway through the game.
- Levels are now written in YAML.
  - New level scripts were written in Node.js; no more dependency on Python.
