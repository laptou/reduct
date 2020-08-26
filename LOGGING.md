# Logging

Reduct collects logs as the player navigates through the game. Here are the
types of logs that can be collected. Since logs are JSON-formatted, some of them
have properties that increase the amount of information they carry. Every log
entry has a timestamp.

## Session and navigation
- `session:start`: the player has opened the game window
- `session:end`: the player has closed the game window. this event is not guaranteed to send
- `window:blur`: the player has navigated away from the game window, but not closed it
- `window:focus`: the player has navigated back to the game window
- `nav:tutorial`: the player has navigated to the tutorial screen
- `nav:title`: the player has navigated to the title screen
- `nav:gameplay`: the player has navigated to the gameplay screen
- `nav:credits`: the player has navigated to the credits screen
- `nav:survey`: the player has navigated to the survey screen

## Research consent
- `research:consent`: the player has given or refused consent to participate in
  the study.
  - `consent`: `true` if the player gave their consent, `false` if they refused

## Gameplay
- `game:start-level`: the player has started a level
  - `levelIndex`: the 0-based index of the level they started
- `game:move-node-to-board`: the player has moved a node from the toolbox or from a slot to the board
  - `nodes.moved`: the node that the player moved
  - `error`: the error that was displayed when the player attempted this, if any
- `game:move-node-to-defs`: the player has moved a node from the board to the global scope
  - `nodes.moved`: the node that the player moved
  - `error`: the error that was displayed when the user attempted this, if any
- `game:move-node-to-slot`: the player has moved a node from the toolbox, board, or slot to a slot
  - `nodes.moved`: the node that the player moved
  - `error`: the error that was displayed when the user attempted this, if any
- `game:undo`: the player undid an action
- `game:redo`: the player redid an action
- `game:execute`: the player reduced a node
  - `executed`: the node that the player reduced (in its pre-reduction state)
  - `added`: the nodes that were added to the game as a result of this operation
  - `removed`: the nodes that were removed from the game as a result of this operation
- `game:victory`: the player won the level
- `game:defeat`: the player got stuck
- `game:time`: the player ran out of time
- `game:stats`: the player has finished the game; game is uploading statistics about play time and completion
  - `startTime`: the time when the player started their first level
  - `levels.{number}`: stats for level with index `{number}`; are frozen once the player completes a level once (i.e., not affected by the player re-playing levels)
    - `totalDuration`: time in milliseconds between the player first opening this level and the player completing it
    - `playDuration`: time in milliseconds that the player spent actually looking at this level (`totalDuration` minus any time where the player switched to another level)
    - `startTime`: the time at which the player started this level
    - `resumeTime`: the time at which the player came back to this level (will be different from `startTime` iff the player skipped this level and then came back)

## Feedback
- `user:feedback`: the player clicked on a button in the affect dialog
  - `affect`: an affect, such as `'confident'` or `'frustrated'`
