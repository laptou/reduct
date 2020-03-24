import FontFaceObserver from "fontfaceobserver";
import { Howl } from "howler";

import * as gfx from "./gfx/core";
import * as globalProgressions from "./game/progression";
import { getJSON } from "./util/ajax";

const BASE_PATH = "resources/";

function getImage(path) {
    return new Promise((resolve) => {
        const image = document.createElement("img");
        image.onload = function() {
            resolve(image);
        };
        image.setAttribute("src", path);
    });
}

export class LoaderClass {
    constructor(root) {
        this.rootPath = root;
        this.graphicsPath = `${root}/graphics/`;
        this.pending = this.loaded = 0;

        this._promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
        });

        this.images = {};
        this.progressions = {};
        this.sounds = {};
        this.audioSprites = {};
        this.audioVolumes = {};
    }

    get finished() {
        return this._promise;
    }

    startLoad() {
        this.pending++;
    }

    finishLoad() {
        this.loaded++;
        if (this.loaded === this.pending) {
            this._resolve();
        }
    }

    /**
     * 
     * @param {String} alias The name of this atlas.
     * @param {String} key The name of the JSON file corresponding to this atlas (no extension).
     * @param {String} imagePath The path to the image file relative to the `resources/graphics` directory.
     */
    async loadImageAtlas(alias, key, imagePath) {
        this.startLoad();

        const [ json, img ] = await Promise.all([
            import(`@resources/graphics/${key}.json`),
            import(`@resources/graphics/${imagePath}`),
        ]);

        const atlas = new gfx.image.ImageAtlas(alias, json, img);
        for (const sprite of atlas.sprites) {
            if (!this.images[sprite.name]) {
                this.images[sprite.name] = sprite.image;
            }
        }

        this.finishLoad();
    }

    async loadAudioSprite(alias, key) {
        this.startLoad();
        const data = await import(`@resources/audio/${key}.json`);

        await new Promise((resolve, reject) => {
            for (const key of Object.keys(data.volumes)) {
                this.audioVolumes[key] = volumes[key];
            }

            this.audioSprites[alias] = new Howl({
                src: data.urls.map(u => require(`@resources/audio/${u}`)),
                sprite: data.sprite,
                onload: () => {
                    for (const key of Object.keys(json.sprite)) {
                        this.sounds[key] = this.audioSprites[alias];
                    }
                },
                onloaderror: reject
            });
        });

        this.finishLoad();
    }

    async loadSyntax(progression, key) {
        this.startLoad();

        this.progressions[progression].syntax[name] = await import(`@resources/levels-progression/${key}.json`);

        this.finishLoad();
    }

    async loadChapter(progression, key) {
        this.startLoad();

        const json = await import(`@resources/levels-progression/${key}.json`); 
        
        // Copy the planet's aliens to the individual level
        // definitions, so that buildLevel has access to
        // them. Provide a default alien when not specified.
        const aliens = (json.resources && json.resources.aliens)
            ? json.resources.aliens : ["alien-function-1"];
        for (const level of json.levels) {
            level.resources = level.resources || { aliens };
        }

        const d = {
            key: key,
            name: json.chapterName,
            description: json.description,
            challenge: json.challenge || false,
            language: json.language,
            levels: [],
            dependencies: [],
            password: json.password,
        };
        if (json.resources) d.resources = json.resources;

        json.levels.forEach((lvl) => {
            lvl.language = d.language;
            if (json.macros) lvl.macros = json.macros;
            if (typeof lvl.goal === "string") lvl.goal = [lvl.goal];
            if (!lvl.toolbox) lvl.toolbox = [];
            if (typeof lvl.board === "string") lvl.board = [lvl.board];
            if (typeof lvl.toolbox === "string") lvl.toolbox = [lvl.toolbox];
            if (!lvl.defines) lvl.defines = [];
            else if (typeof lvl.defines === "string") lvl.defines = [lvl.defines];
            if (!lvl.globals) lvl.globals = {};
            if (!lvl.syntax) lvl.syntax = [];
            // used for hiding definitions on the sidebar
            if (!lvl.hideGlobals) lvl.hideGlobals = [];
            // used for autograder tests
            if (!lvl.input) lvl.input = [];
            if (!lvl.output) lvl.output = [];
            if (!lvl.numTests) lvl.numTests = 0;
            else if (typeof lvl.syntax === "string") lvl.syntax = [lvl.syntax];

            if (!lvl.fade) lvl.fade = {};

            if (!lvl.animationScales) lvl.animationScales = {};

            if (typeof lvl.showConcreteGoal === "undefined") lvl.showConcreteGoal = true;
            if (typeof lvl.tutorialUrl === "undefined") lvl.tutorialUrl = null;

            d.levels.push(lvl);
        });

        this.progressions[progression].chapters[key] = d;

        this.finishLoad();
    }

    async loadChapters(name, definition) {
        this.startLoad();
        // Initilizing variables --s
        const progression = this.progressions[name] = {
            chapters: {},
            levels: [],
            linearChapters: [],
            syntax: {},
        };
        const chapterKeys = Object.keys(definition.digraph);

        let extraDefines = [];
        let animationScales = {};
        let fade = {};

        // counting dependencies for each chapter so
        // as to sort the chapters in order --s
        await Promise.all(chapterKeys.map((key) => this.loadChapter(name, key)));

        for (const chapter of chapterKeys) {
            progression.chapters[chapter].transitions = definition.digraph[chapter];
            for (const transition of definition.digraph[chapter]) {
                progression.chapters[transition].dependencies.push(chapter);
            }
        }

        // Topological sort
        const marked = {};
        let remaining = chapterKeys.length;

        outerLoop:
        while (remaining > 0) {
            for (const [chapterName, chapter] of Object.entries(progression.chapters)) {
                if (chapter.dependencies.every((dep) => marked[dep]) && !marked[chapterName]) {
                    marked[chapterName] = true;
                    progression.linearChapters.push(chapterName);

                    chapter.startIdx = progression.levels.length;
                    progression.levels = progression.levels.concat(chapter.levels);
                    chapter.endIdx = progression.levels.length - 1;

                    remaining--;

                    // TODO: patch defines
                    for (const level of chapter.levels) {
                        // setting animationScales
                        const newScales = {

                            ...animationScales,
                            ...level.animationScales,
                        };
                        level.animationScales = Object.assign(
                            animationScales,
                            level.animationScales,
                        );
                        animationScales = newScales;

                        // setting fade property
                        const newFade = { ...fade, ...level.fade };
                        level.fade = { ...fade, ...level.fade };
                        fade = newFade;

                        // setting extradefines - functions that show
                        // on the sidebar
                        level.extraDefines = extraDefines;
                        extraDefines = extraDefines.concat(level.defines);

                        for (const syntax of level.syntax) {
                            if (progression.syntax[syntax]) continue;

                            progression.syntax[syntax] = this.loadSyntax(name, syntax);
                        }
                    }

                    continue outerLoop;
                }
            }

            console.error("Loader#loadChapters: Could not finish digraph.");
            break;
        }

        globalProgressions.PROGRESSIONS[name].progression = progression;

        this.finishLoad();
    }

    async waitForFonts(fonts) {
        this.startLoad();
        await Promise.all(fonts.map((name) => new FontFaceObserver(name).load(null, 5000)));
        this.finishLoad();
    }
}

const Loader = new LoaderClass();
export default Loader;
