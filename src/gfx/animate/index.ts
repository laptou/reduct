import { Clock } from "./clock";

let scales: Record<string, number> = {};

export function setDurationScale(category: string, factor: number) {
    scales[category] = factor;
}

export function replaceDurationScales(newScales: Record<string, number>) {
    scales = { ...newScales };
}

/**
 * Scale a duration by the given categories' scale factors.
 *
 * @param {number} duration
 * @param {...String} categories
 *
 * @example
 * animate.tween(view, { opacity: 0 }, {
 *     duration: animate.scaleDuration(300, "expr-add", "global-scale"),
 * });
 */
export function scaleDuration(duration: number, ...categories: string[]) {
    for (const category of categories) {
        duration *= (typeof scales[category] === "undefined" ? 1.0 : scales[category]);
    }
    return duration;
}

/**
 * The default clock.
 */
export const clock = new Clock();

/**
 * Add a callback that is fired every animation tick.
 *
 * Useful to trigger a re-render whenever an animation updates.
 *
 * @param {Function} f - The function to be called.
 */
export function addUpdateListener(f: { (): void; }) {
    clock.addUpdateListener(f);
}

/**
 * Add a tween to the default clock (and start the clock if
 * applicable).
 *
 * @param {Object} target - The object whose properties to tween.
 * @param {Object} properties - A (nested) dictionary of property
 * values to tween to.
 * @param {Object} options - Other options for the tween. See
 * :js:func:`~animate.Clock.tween`.
 */
export function tween(target, properties, options = {}) {
    return clock.tween(target, properties, options);
}

/**
 * Add an infinite tween to the default clock.
 *
 * @param {Function} updater - The update function. See
 * :class:`~animate.InfiniteTween`.
 * @param {Object} options
 */
export function infinite(updater, options = {}) {
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

/**
 * A helper function to resolve a Promise after a specified delay.
 *
 * @param ms {number} The delay in milliseconds.
 * @returns {Promise}
 */
export function after(ms) {
    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve();
        }, ms / clock.scale);
    });
}
