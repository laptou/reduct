import '@resources/style/index.css';
import * as Sentry from '@sentry/react';
import { enableMapSet } from 'immer';
import 'react-hot-loader';
import * as progression from './game/progression';
import Loader from './loader';
import { initReactApp } from './view';
import { store, persistor } from './store';

if (PKG_ENV === 'production') {
  // initialize Sentry (logging + error tracking)
  Sentry.init({ 
    dsn: 'https://4960b765fb5d4f269fe7abc68734abfd@o190059.ingest.sentry.io/5310258',
    environment: PKG_ENV
  });
}

// initialize Immer (immutable state creation)
enableMapSet();

(async () => {
  console.log(`Reduct v${PKG_VERSION} ${PKG_ENV}`);

  // load assets
  await Loader.loadAudioSprite('sounds', 'output');
  await Loader.loadImageAtlas('spritesheet', 'assets', 'assets.png');
  await Loader.loadImageAtlas('titlesprites', 'title-assets', 'title-assets.png');
  await Loader.loadImageAtlas('menusprites', 'menu-assets', 'menu-assets.png');
  await Loader.loadChapters('Elementary', progression.ACTIVE_PROGRESSION_DEFINITION);
  await Loader.waitForFonts(['Fira Mono', 'Fira Sans', 'Nanum Pen Script']);

  // do not begin to load persisted state until after levels are loaded
  persistor.persist();

  initReactApp(store);

})().catch(error => {
  if (PKG_ENV === 'production')
    Sentry.captureException(error);
  else 
    console.error(error);
});
