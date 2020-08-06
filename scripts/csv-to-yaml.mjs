/**
 * @file Script to convert levels specified in CSV to levels specified in YAML.
 * @author Ibiyemi Abiodun
 */

import { resolve, dirname, basename } from 'path';
import fs from 'fs-extra';
import csv from 'csv';
import yaml from 'js-yaml';

(async () => {
  // __dirname does not work in ES modules
  const scriptDirectory = dirname(new URL(import.meta.url).pathname);
  const chapterDirectory = resolve(scriptDirectory, '../chapterutil/levels');

  if (!await fs.pathExists(chapterDirectory))
    throw new Error(`Could not find ${chapterDirectory}`);

  const chapterFiles = (await fs.readdir(chapterDirectory)).filter(fileName => fileName.endsWith('.csv'));
  console.info(`found ${chapterFiles.length} CSV level definitions`);

  for (const fileName of chapterFiles) {
    console.info(`processing ${fileName}`);

    const csvFilePath = resolve(chapterDirectory, fileName);
    const contents = await fs.readFile(csvFilePath);
    const parser = csv.parse(contents, {
      // return objects instead of arrays, treat first row as header
      columns: true,
      // trim trailing spaces
      rtrim: true,
      // don't throw exception if a row has fewer columns than header
      relaxColumnCount: true,
    });

    const levels = [];

    for await (const record of parser) {
      // there may be singlequotes and empty fields in the CSV files, so eval will
      // do a better job than JSON parse
      const board = eval(record.board) || [];
      const goal = eval(record.goal) || [];
      const toolbox = eval(record.toolbox) || [];
      const defines = eval(record.defines) || [];
      const hiddenGlobals = eval(record.hideGlobals) || [];
      const autograderInputs = eval(record.input) || [];
      const autograderOutputs = eval(record.output) || [];
      const syntax = eval(record.syntax) || [];

      // surround in parens so that curly braces are interpreted as objects and
      // not blocks
      const globals = eval(`(${record.globals})`) || {};

      const hint = record.textGoal;
      const note = record.note || record['FVG note'] || null;

      levels.push({
        board,
        goal,
        toolbox,
        defines,
        hint, 
        note,
        syntax,
        globals: {
          add: globals,
          hide: hiddenGlobals,
        },
        autograder: {
          inputs: autograderInputs,
          outputs: autograderOutputs,
        },
      });
    }

    const yamlFileName = `${basename(basename(fileName, '.csv'), '.yaml')}.yaml`;
    const yamlFilePath = resolve(chapterDirectory, yamlFileName);
    const yamlData = yaml.safeDump({ levels });
    await fs.writeFile(yamlFilePath, yamlData);
  }

  console.info('done');
})();
