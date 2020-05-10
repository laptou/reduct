import * as Easing from './easing';

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
        duration *= (typeof scales[category] === 'undefined' ? 1.0 : scales[category]);
    }
    return duration;
}

export {
    default as Clock, addUpdateListener, after, chain, clock, infinite, tween
} from './clock';
export { Easing }; // TODO: fix when babel supports `export * as ns` syntax
export type { Tween, TweenOptions, TweenStatus } from './tween';
export { default as InterpolateTween } from './tween/interpolate';
export { default as InfiniteTween } from './tween/infinite';
