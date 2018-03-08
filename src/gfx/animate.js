import chroma from "chroma-js";

export const Easing = {
    Linear: (start, stop, t) => start + (t * (stop - start)),

    Quadratic: {
        In: (start, stop, t) => start + (t * t * (stop - start)),
        Out: (start, stop, t) => start - (t * (t - 2) * (stop - start)),
        InOut: (start, stop, t) => {
            t *= 2;
            if (t < 1) {
                return start + (((stop - start) * t * t) / 2);
            }
            t -= 1;
            return start - (((stop - start) * ((t * (t - 2)) - 1)) / 2);
        },
    },

    Cubic: {
        In: (start, stop, t) => start + (t * t * t * (stop - start)),
        Out: (start, stop, t) => {
            t -= 1;
            return start + (((t * t * t) + 1) * (stop - start));
        },
        InOut: (start, stop, t) => {
            t *= 2;
            if (t < 1) {
                return start + (((stop - start) * t * t * t) / 2);
            }
            t -= 2;
            return start + (((stop - start) * ((t * t * t) + 2)) / 2);
        },
    },

    Exponential: {
        Out: (start, stop, t) => {
            return ((stop - start) * (1 - (2 ** (-10 * t)))) + start;
        },
    },

    Color: (easing, src, dst) => {
        const scale = chroma.scale([ src, dst ]).mode("lch");
        return (start, stop, t) => scale(easing(0.0, 1.0, t));
    },

    Projectile: (easing) => (start, stop, t) => {
        const dy = stop - start;
        // console.log(start, stop, t, start + (-4 * dy * t * t) + (4 * dy * t));
        t = easing(0.0, 1.0, t);
        return start + (-4 * dy * t * t) + (4 * dy * t);
    },
};


export class Tween {
    constructor(clock, options) {
        this.clock = clock;
        this.options = options;
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });

        this.status = "running";
    }

    update(dt) {
        return false;
    }

    then(cb1, cb2) {
        return this.promise.then(cb1, cb2);
    }

    delay(ms) {
        this.status = "paused";
        setTimeout(() => {
            this.status = "running";
            this.clock.start();
        }, ms);
        return this;
    }

    completed() {
        this.status = "completed";
        this.resolve();
        if (this.options.callback) {
            this.options.callback();
        }
    }
}


export class InterpolateTween extends Tween {
    constructor(clock, properties, duration, options) {
        super(clock, options);

        this.properties = properties;
        this.duration = duration;
        this.remaining = duration;
        this.reverse = false;
        this.repeat = 1;
        this.reversing = false;

        if ("reverse" in options) {
            this.reverse = options.reverse;
        }
        if ("repeat" in options) {
            this.repeat = options.repeat;
        }
    }

    update(dt) {
        if (this.status !== "running") {
            return false;
        }

        if (this.reversing) {
            this.remaining += dt;
        }
        else {
            this.remaining -= dt;
        }

        let t = Math.max(0, 1 - (this.remaining / this.duration));
        let completed = false;

        if ((!this.reversing && this.remaining <= 0) ||
            (this.reversing && this.remaining >= this.duration)) {
            this.repeat -= 1;
            if (this.repeat <= 0) {
                completed = true;
                t = 1.0;
            }
            else {
                if (this.reverse) {
                    this.reversing = !this.reversing;
                }
                else {
                    this.remaining = this.duration;
                }
                t = Math.max(0, 1 - (this.remaining / this.duration));
            }
        }

        for (const attr of this.properties) {
            const { target, property, start, end, easing } = attr;
            target[property] = easing(start, end, t);
        }

        if (completed) {
            this.completed();
            return false;
        }
        return true;
    }

    /** Resets properties affected back to their initial value. */
    undo() {
        for (const attr of this.properties) {
            const { target, property, start } = attr;
            target[property] = start;
        }
    }

    cancel() {
        this.status = "completed";
    }
}

export class InfiniteTween extends Tween {
    constructor(clock, updater, options) {
        super(clock, options);

        this.updater = updater;
        this.stopped = false;
    }

    update(dt) {
        if (this.status !== "running") {
            return false;
        }

        const finished = this.stopped || this.updater(dt);
        if (finished) {
            this.completed();
            return false;
        }

        return true;
    }

    stop() {
        this.stopped = true;
    }
}

export class Clock {
    constructor() {
        this.listeners = [];
        this.tweens = [];
        this.running = false;
        this.lastTimestamp = null;
        this._scale = null;
        this.tick = this.tick.bind(this);
    }

    get scale() {
        if (this._scale) {
            return this._scale;
        }
        const el = document.querySelector("#animation-speed-slider");
        if (el) {
            return el.value;
        }
        return 1;
    }

    set scale(s) {
        this._scale = s;
    }

    addUpdateListener(f) {
        this.listeners.push(f);
    }

    tick(t) {
        const dt = this.scale * (t - this.lastTimestamp);
        const completed = [];
        let running = false;
        for (const tween of this.tweens) {
            running = tween.update(dt) || running;
            if (tween.status === "completed") {
                completed.push(tween);
            }
        }

        for (const tween of completed) {
            this.tweens.splice(this.tweens.indexOf(tween), 1);
        }

        this.running = this.tweens.length > 0 && running;

        if (this.running) {
            this.lastTimestamp = t;
            window.requestAnimationFrame(this.tick);
        }
        else {
            this.lastTimestamp = null;
        }

        for (const listener of this.listeners) {
            listener();
        }
    }

    tween(target, properties, options) {
        const duration = options.duration || 300;
        const props = [];
        const defaultEasing = options.easing || Easing.Linear;

        const buildProps = (subTarget, subProps, easing) => {
            for (let [ prop, final ] of Object.entries(subProps)) {
                let start = null;

                if (Array.isArray(final)) {
                    if (final.length === 2 && typeof final[1] === "function") {
                        [ final, easing ] = final;
                    }
                    else if (final.length === 2) {
                        [ start, final ] = final;
                    }
                    else if (final.length === 3) {
                        [ start, final, easing ] = final;
                    }
                    else {
                        throw "Tween target can only be array if array is length 2 or 3";
                    }
                }

                if (typeof final === "number" || typeof final === "string") {
                    props.push({
                        target: subTarget,
                        property: prop,
                        start: start || subTarget[prop],
                        end: final,
                        easing,
                    });
                }
                else if (final) {
                    buildProps(subTarget[prop], final, easing);
                }
            }
        };

        buildProps(target, properties, defaultEasing);
        // Set flag so that layout functions know to skip this view,
        // if it is a child. Use counter to allow overlapping tweens.
        if (typeof target.animating === "number") {
            target.animating += 1;
        }
        else {
            target.animating = 1;
        }

        const decrementAnimatingCount = () => {
            if (typeof target.animating === "number") {
                target.animating -= 1;
            }
            else {
                target.animating = 0;
            }
        };

        const result = this.addTween(new InterpolateTween(this, props, duration, options));
        result.then(() => {
            if (options.restTime) {
                return after(options.restTime);
            }
            return null;
        }).then(() => decrementAnimatingCount());
        return result;
    }

    addTween(tween) {
        this.tweens.push(tween);
        if (!this.running) {
            this.start();
        }

        return tween;
    }

    start() {
        if (!this.running) {
            this.running = true;
            this.lastTimestamp = window.performance.now();
            window.requestAnimationFrame(this.tick.bind(this));
        }
    }

    cancelAll() {
        this.running = false;
        this.lastTimestamp = null;
        while (this.tweens.length > 0) {
            this.tweens.pop();
        }
    }
}

export const clock = new Clock();

export function addUpdateListener(f) {
    clock.addUpdateListener(f);
}

export function tween(target, properties, options={}) {
    return clock.tween(target, properties, options);
}

export function infinite(updater, options={}) {
    return clock.addTween(new InfiniteTween(clock, updater, options));
}

export function chain(target, ...properties) {
    if (properties.length % 2 !== 0) {
        throw "animate.chain: Must provide an even number of properties.";
    }
    let base = null;
    for (let i = 0; i < properties.length; i += 2) {
        if (base === null) {
            base = tween(target, properties[i], properties[i + 1]);
        }
        else {
            base = base.then(() => tween(target, properties[i], properties[i + 1]));
        }
    }

    return base;
}

export function after(ms) {
    return new Promise((resolve) => {
        window.setTimeout(function() {
            resolve();
        }, ms / clock.scale);
    });
}

let scales = {};

export function setDurationScale(category, factor) {
    scales[category] = factor;
}

export function replaceDurationScales(_scales) {
    scales = Object.assign({}, _scales);
}

export function scaleDuration(ms, ...categories) {
    for (const category of categories) {
        ms *= (typeof scales[category] === "undefined" ? 1.0 : scales[category]);
    }
    return ms;
}

import * as fx from "./fx/fx";
export { fx };
