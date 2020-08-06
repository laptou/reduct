/**
 * @file Script to convert levels specified in YAML to CSV.
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

  const chapterFiles = (await fs.readdir(chapterDirectory)).filter(fileName => fileName.endsWith('.yaml'));
  console.info(`found ${chapterFiles.length} YAML level definitions`);

  for (const fileName of chapterFiles) {
    console.info(`processing ${fileName}`);

    const yamlFilePath = resolve(chapterDirectory, fileName);
    const contents = await fs.readFile(yamlFilePath);
    const { levels } = yaml.safeLoad(contents);

    const columns =  [
      'board',
      'goal',
      'toolbox',
      'defines',
      'globals',
      'hideGlobals',
      'input',
      'output',
      'textGoal', 
      'note',
    ];

    const writer = csv.stringify({ 
      columns,
      header: true,
    });

    const csvFileName = `${basename(fileName)}.csv`;
    const csvFilePath = resolve(chapterDirectory, csvFileName);

    writer.pipe(fs.createWriteStream(csvFilePath));

    for (const level of levels) {
      const csvLevel = {
        board: level.board,
        goal: level.goal,
        toolbox: level.toolbox,
        defines: level.defines,
        globals: level.globals.add,
        hideGlobals: level.globals.hide,
        input: level.autograder && level.autograder.inputs,
        output: level.autograder && level.autograder.outputs,
        textGoal: level.hint,
        note: level.note,
      };

      writer.write(csvLevel);
    }

    await new Promise(resolve => writer.end(resolve));
  }

  console.info('done');
})();
