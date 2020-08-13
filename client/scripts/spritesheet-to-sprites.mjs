import fs from 'fs-extra';
import { basename, dirname, resolve } from 'path';
import sharp from 'sharp';

(async () => {
  // __dirname does not work in ES modules
  const scriptDirectory = dirname(new URL(import.meta.url).pathname);
  const spriteSheetDirectory = resolve(scriptDirectory, '../resources/graphics');

  if (!await fs.pathExists(spriteSheetDirectory))
    throw new Error(`Could not find ${spriteSheetDirectory}`);

  const fileNames = await fs.readdir(spriteSheetDirectory);
  const manifestFileNames = fileNames.filter(fn => fn.endsWith('.json'));

  for (const manifestFileName of manifestFileNames) {
    console.info(`processing ${manifestFileName}`);
    const manifestFilePath = resolve(spriteSheetDirectory, manifestFileName);
    const manifest = await fs.readJson(manifestFilePath);

    const imageFileName = manifest.meta.image;
    const imageFilePath = resolve(spriteSheetDirectory, imageFileName);
    const image = sharp(imageFilePath);

    const folderName = basename(manifestFileName, '.json');
    const folderPath = resolve(spriteSheetDirectory, folderName);

    // create folder to contain sprites
    await fs.ensureDir(folderPath);

    for (const [spriteName, info] of Object.entries(manifest.frames)) {
      const spritePath = resolve(folderPath, spriteName);
      
      const result = await image
        .extract({
          left: info.frame.x,
          top: info.frame.y,
          width: info.frame.w,
          height: info.frame.h,
        })
        .resize({
          width: info.sourceSize.width,
          height: info.sourceSize.height,
          fit: 'fill'
        })
        .toFile(spritePath);
      
      console.log(`created ${folderName}/${spriteName}`);
    }
  }
})()
