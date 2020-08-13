# `@reduct/client`
<small>v7.0.6-alpha</small>

## How does this code work?

Check out DESIGN.md.

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

