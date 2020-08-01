/**
 * @file Script to convert levels specified in CSV to levels specified in YAML.
 * @author Ibiyemi Abiodun
 *
 * Why convert levels into YAML, you ask? The argument I heard for specifying
 * the levels in CSV is that it is easy to edit them in a spreadsheet editor.
 *
 * However, that doesn't make sense to me, because this is code, and CSV is very
 * inconvenient to edit in a code editor. Moreover, since CSV delimits things
 * with commas, we have to use a bunch of extra quotation marks whenever we want
 * to use commas in the JS that represents our levels.
 *
 * I'm not trying to be a jerk, so I have also provided yaml-to-csv.js if you
 * want to keep using the spreadsheet editor. However, YAML will be the
 * authoritative definition of the levels from now on.
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

    // to unwrap values that don't need to be strings
    const unstringify = (arr) => arr.reduce((acc, item) => {
      const int = parseInt(item, 10);
      if (!isNaN(int)) { acc.push(int); return acc; }

      const float = parseFloat(item, 10);
      if (!isNaN(float)) { acc.push(float); return acc; }

      if (item === 'true') { acc.push(true); return acc; }
      if (item === 'false') { acc.push(false); return acc; }
      if (item === '') return acc;

      acc.push(item);
      return acc;
    }, []);

    for await (const record of parser) {
      // there may be singlequotes and empty fields in the CSV files, so eval will
      // do a better job than JSON parse
      const board = unstringify(eval(record.board) || []);
      const goal = unstringify(eval(record.goal) || []);
      const toolbox = unstringify(eval(record.toolbox) || []);
      const defines = unstringify(eval(record.defines) || []);
      const hiddenGlobals = unstringify(eval(record.hideGlobals) || []);
      const autograderInputs = unstringify(eval(record.input) || []);
      const autograderOutputs = unstringify(eval(record.output) || []);
      const syntax = eval(record.syntax) || [];

      // surround in parens so that curly braces are interpreted as objects and
      // not blocks
      const globals = eval(`(${record.globals})`) || {};

      const textgoal = record.textgoal;
      const note = record.note || record['FVG note'] || null;

      levels.push({
        board,
        goal,
        toolbox,
        defines,
        globals,
        textgoal, 
        note,
        hiddenGlobals,
        syntax,
        autograder: {
          inputs: autograderInputs,
          outputs: autograderOutputs
        }
      });
    }

    const yamlFileName = `${basename(basename(fileName, '.csv'), '.yaml')}.yaml`;
    const yamlFilePath = resolve(chapterDirectory, yamlFileName);
    const yamlData = yaml.safeDump({ levels });
    await fs.writeFile(yamlFilePath, yamlData);
  }

  console.info('done');
})();
