#!/bin/bash

set -e

function usage {
  echo "Usage: automate.sh [XLSX file | CSV directory]"
  echo "Probably should use 'levels' as the second argument"
  exit 1
}

if [[ $# != 1 ]]
then
  usage
fi

gen_csv=0

# deletes the temp directory
function cleanup {
  if [[ "$gen_csv" = 1 ]]
  then
    rm -rf "$WORK_DIR"
    echo "Deleted temp working directory $WORK_DIR"
  fi
}

# register the cleanup function to be called on the EXIT signal
trap cleanup EXIT

## Start of script

if [[ -d "$1" ]]
then
  gen_csv=0
  WORK_DIR="$1"
else
  gen_csv=1
  WORK_DIR=$(mktemp -d "$(pwd)/temp.XXXX")

# check if tmp dir was created
  if [[ ! "$WORK_DIR" || ! -d "$WORK_DIR" ]]; then
    echo "Could not create temp dir"
    exit 1
  fi
  xlsx2csv "$1" -i -s 0 | python splitcsv.py ${WORK_DIR}
fi

for filepath in ${WORK_DIR}/*.csv; do
    filename=$(basename ${filepath})
    echo Importing ${filename%.*}
    outputfile=../resources/levels-progression/${filename%.*}.json
    if [[ ! -r "$outputfile" ]]
    then
        echo "The output JSON file $outputfile must be created before the level can be built."
        exit 1
    fi
    python chapterutil.py ${filepath} "$outputfile"
done

#cd "$WORK_DIR"
#echo "Spawning a shell in $WORK_DIR"
#$SHELL
