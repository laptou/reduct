# Reduct React
<small>v7.0.15-beta</small>

This is Ibiyemi Abiodun's fork of the project. It has been ported to TypeScript
and uses a completely new renderer written in React. It also has a backend
server that handles logging and authentication.

## Why?

- Why React: This game is basically an app with bright colours and sound
  effects. This meant that it was not really taking advantage of the powers of
  using `<canvas>`, but it was bearing the disadvantages. The game was
  maintaining its own layout engine, for example, but did not contain any styles
  of layout that cannot be expressed in CSS. This made it difficult to add new
  features without facing great complexity and performance impacts.
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
- `npm i -g yarn` to install the Yarn package manager.
- `yarn install` to install dependencies common to the client and the server.
- `cd server` to go to the server directory.
- `export NODE_ENV=development` to ensure the server will run in development mode.
- `yarn run build` to build the server.
- `yarn run serve` to run the web server.
- Go to http://localhost:8080/ to view the development web server.
