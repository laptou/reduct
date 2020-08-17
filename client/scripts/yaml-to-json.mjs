/**
 * @file Script to convert levels specified in YAML to CSV.
 * @author Ibiyemi Abiodun
 */

import { resolve, dirname, basename } from 'path';
import fs from 'fs-extra';
import yaml from 'js-yaml';

void (async () => {
  // __dirname does not work in ES modules
  const scriptDirectory = dirname(new URL(import.meta.url).pathname);
  const chapterDirectory = resolve(scriptDirectory, '../chapterutil/levels');
  const levelDirectory = resolve(scriptDirectory, '../resources/levels-progression');

  if (!await fs.pathExists(chapterDirectory))
    throw new Error(`Could not find ${chapterDirectory}`);

  if (!await fs.pathExists(levelDirectory))
    throw new Error(`Could not find ${levelDirectory}`);

  const chapterFiles = (await fs.readdir(chapterDirectory)).filter(fileName => fileName.endsWith('.yaml'));
  console.info(`found ${chapterFiles.length} YAML level definitions`);

  const chapterNames = [];

  for (const fileName of chapterFiles) {
    console.info(`processing ${fileName}`);
    const chapterName = basename(fileName, '.yaml');
    chapterNames.push(chapterName);

    const yamlFilePath = resolve(chapterDirectory, fileName);
    const contents = await fs.readFile(yamlFilePath);
    const { levels, name } = yaml.safeLoad(contents);

    // this script should just update the existing JSON definitions, not
    // overwrite them
    const jsonFilePath = resolve(levelDirectory, `${chapterName}.json`);
    let originalChapter;

    try {
      originalChapter = await fs.readJSON(jsonFilePath);
    } catch {
      originalChapter = { levels: [] };
    }

    levels.forEach((level, index) => {
      let originalLevel;

      // if YAML contains more levels than JSON, add them
      if (index in originalChapter.levels) {
        originalLevel = originalChapter.levels[index];
      } else {
        originalLevel = {};
        originalChapter.levels.push(originalLevel);
      }

      originalLevel.board = level.board;
      originalLevel.goal = level.goal;
      originalLevel.toolbox = level.toolbox;
      originalLevel.syntax = level.syntax || [];
      originalLevel.defines = level.defines || [];
      originalLevel.globals = level.globals && level.globals.add || {};
      originalLevel.hideGlobals = level.globals && level.globals.hide || [];
      originalLevel.input = level.autograder && level.autograder.input || [];
      originalLevel.output = level.autograder && level.autograder.output || [];
      originalLevel.textgoal = level.hint;
    });

    // if JSON has more levels than YAML, cut them
    originalChapter.levels = originalChapter.levels.slice(0, levels.length);
    originalChapter.chapterName = name;
    
    await fs.writeJSON(jsonFilePath, originalChapter);
  }

  // delete JSON files that don't correspond to a YAML file
  for (const jsonFileName of await fs.readdir(levelDirectory)) {
    const chapterName = basename(jsonFileName, '.json');
    
    if (!chapterNames.includes(chapterName)) {
      console.log(`deleting ${jsonFileName}`);
      await fs.unlink(resolve(levelDirectory, jsonFileName));
    }
  }

  console.info('done');
})();
