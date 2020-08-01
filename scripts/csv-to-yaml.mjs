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

import { resolve, dirname } from 'path';
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

    const filePath = resolve(chapterDirectory, fileName);
    const contents = await fs.readFile(filePath);
    const parser = csv.parse(contents, {
      columns: true,
      rtrim: true, 
      relaxColumnCount: true,
    });

    for await (const record of parser) {
      console.log(record);
    }
  }

  console.info('done');
})().catch(err => console.error(err));
