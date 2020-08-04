# Reduct React
<small>v7.0.2-alpha</small>

This is Ibiyemi Abiodun's fork of the project. It has been ported to TypeScript
and uses a completely new renderer written in React.

## Why?

- Why React: This game is basically an app with bright colours and sound
  effects. The true capabilities of the `<canvas>` were hardly being used, but
  the `<canvas>`-based renderer was quite limiting. Moreover, using `<canvas>`
  presented performance issues that would have been very challenging, if not
  infeasible or impossible, to optimize away. Rendering using HTML & SVG
  elements and CSS styles is flexible enough for this use-case.
- Why TypeScript: TypeScript makes finding, understanding, and refactoring code
  *significantly* easier. The productivity gained by working in TypeScript was
  too great to leave on the table.

## What for?

In collaboration with René Kizilcec, François Guimbretière, Ian Tomasik, and
Walker White, I am doing an experiment to see if this game can be used to
effectively measure the computer science capabilities of incoming CS students,
akin to the CASE exam.

## How do I run this?

- Install Node.js v13 or higher.
- `npm install` to install dependencies.
- `npm run serve` to start the development web server.
- Go to http://localhost:1234/ to view the development web server.

## How does this code work?

Check out DESIGN.md.

## Ooh, I see a `docs/` folder.

Almost everything in that folder is currently outdated.

## How do I edit the levels?

The levels are specified in YAML files in `chapterutil/levels`. These are
specifications need to be transformed into a more detailed JSON form before
being consumed by the game. After editing a level's YAML file, run
`npm run levels:to-json` to update these JSON files.

### Why are there CSV files?

The levels used to be specified in CSV. However, this is not a convenient format
for editing levels unless you are using Excel, so I switched to YAML. However,
editing levels in CSV is still supported:

- `npm run levels:to-csv` to create CSV files from the YAML files.
- Edit the CSV files.
- `npm run levels:from-csv` to update the YAML files from the CSV files.
- `npm run levels:to-json` to update the JSON files.

