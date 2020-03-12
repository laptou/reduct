reduct-redux
============

Setup
-----

Install the necessary packages and run the bundler.

*Choose either Yarn or NPM:

Yarn:

First, install Yarn if necessary. On the Mac this can be done with `brew install yarn`. Then:

```
yarn install     # install all required node modules in the node_modules directory
mkdir dist
# Symlink resources into the folder that our bundler serves
ln -s "$(pwd)/resources/" dist/resources
yarn serve
open http://localhost:1234/index.html
```

Note that if the installation fails for some reason, you can remove the
node_modules directory to make sure you are starting from a fresh state.

NPM:

```
npm install
mkdir dist
# Symlink resources into the folder that our bundler serves
ln -s "$(pwd)/resources/" dist/resources
npm run serve
open http://localhost:1234/index.html
```

Distribution
------------

If you use Yarn: run `yarn dist`

If you use NPM: run `npm run dist`

The production version of Reduct will be in the `dist/` folder, like so:

```
$ ls dist
7a8f62b47d6afa44523f2b4bfacf0304.png  index.html
7d4e14db6c871b054b74a4c5b2bc2367.js   reduct-redux.js
a18342a55b8501c4686ae638f58cd800.js   reduct-redux.map
d004428b9d33a5c3a235b1f80a1a6641.png  resources
```

(Remember, `resources` is a symlink that you created above.)

Now you can copy the contents of this directory to a web server.

Documentation
-------------

Some documentation of the game is found in the docs/ directory, and
the file docs/README.md explains how to build the documentation.
A possibly out-of-date version of the documentation can also be
found here:

    https://games.lidavidm.me/reduct-redux/docs/

Debugging
---------

The password to skip levels in the production version is
`cornell`. You can enable this during development by appending
`?nodev` to the URL. Conversely, in production, appending `?dev` to
the URL will enable development mode.

If the build system gets confused and doesn't seem to pick up changes
to files, delete the `.cache` folder in the project directory and try
again.

Keyboard shortcuts
- Ctrl + F8: open debug menu, download CSV
- Ctrl + F9: jump to level
- Ctrl + F10: refresh game
- Ctrl + F11: add new node

Editing levels
----------------

The order of the chapters is defined by the variable PROGRESSIONS in the
source file src/game/progression.js. Levels used by the running server
are stored in JSON form in the resources/levels-progression directory.

Previously the JSON representations were generated from a Google
sheet, but sheet has now been converted to CSV files in the
chapterutil/levels. These CSV files can be used to update the levels
completely locally, and they are the place to make edits to level
content, NOT the JSON files.


Instructions:

0. Make sure you have Python 3 installed.
1. Go to the `chapterutil` directory.
2. Run "build.sh levels". This will update the JSON files with the level information.
   Note that the JSON files have some information that is separate from the level
   information, so they are also source files.

    --------
    Old instructions for reading from the Google spreadsheet:
    --------

    0. Go to the `chapterutil` directory. Make sure you have Python 3 and
        virtualenv installed.

        MacOS instructions:
        http://docs.python-guide.org/en/latest/starting/install3/osx/

        Then install virtualenv: `pip install virtualenv`

    1. Set up chapterutil:

    ```
    # All of these must be run IN THE SAME TERMINAL
    virtualenv -p python3 venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

    2. Download the sheet from Google Sheets as XSLX:

        https://docs.google.com/spreadsheets/d/178_SiWADvfS1NkWVbd6ZY78iSxccc-foOLL2WT5P3uI

    3. Create any JSON files for chapters that did not previously
    exist. (Just copy an existing JSON file and edit its title/name. To
    preserve continuity of what aliens appear, try to copy the chapter
    immediately preceding the new chapter.)
    4. Run the following script: `build.sh PATH/TO/XLSX/FILE.xlsx`.
    Again, this must be run from the same
    terminal as previously.

    If you're running this and have previously set it up, run `source
    venv/bin/activate` first.

    It might spit out warnings about not being able to import things -
    this is caused by the rows in the spreadsheet that just contain
    notes.

    --------
    End old instructions
    --------

Generating Spritesheets
-----------------------

TODO:
