import chroma from 'chroma-js';

export type Easing<T = number> = (start: number, stop: number, t: number) => T;
type EasingGroup = { In: Easing; Out: Easing; InOut: Easing };

/**
   * A linear tween.
   */
export const Linear: Easing = (start, stop, t) => start + (t * (stop - start));

/**
   * Quadratic tweens.
   */
export const Quadratic: EasingGroup = {
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
};

/**
   * Cubic tweens.
   */
export const Cubic: EasingGroup = {
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
};

/**
   * Exponential tweens.
   */
export const Exponential: { Out: Easing } = {
  Out: (start, stop, t) => ((stop - start) * (1 - (2 ** (-10 * t)))) + start,
};

/**
   * Interpolate between colors in the CIELAB color space (so it
   * looks more natural than directly tweening RGB values).
   *
   * Right now this easing is not automatically applied. To tween a
   * color, pass the final color as the target value and
   * additionally specify the source and target colors to this
   * easing function, passing the return value as the easing option.
   *
   * @param {Function} easing - The underlying easing function to use.
   * @param {String} src - The start color.
   * @param {String} dst - The final color.
   *
   * @example
   * // Use linear interpolation underneath
   * animate.tween(view, { color: "#000" }, {
   *     duration: 500,
   *     easing: animate.Easing.Color(animate.Easing.Linear, view.color, "#000"),
   * });
   * @example
   * // Use cubic interpolation underneath
   * animate.tween(view, { color: "#000" }, {
   *     duration: 500,
   *     easing: animate.Easing.Color(animate.Easing.Cubic.In, view.color, "#000"),
   * });
   *
   * @returns {Function} The easing function.
   */
export const Color = (easing: Easing, src: string | chroma.Color, dst: string | chroma.Color): Easing<chroma.Color> => {
  const scale = chroma.scale([src, dst]).mode('lch');
  return (start, stop, t) => scale(easing(0.0, 1.0, t));
};

/**
   * Parabolic projectile trajectory tween. Used similarly to
   * :func:`Color`.
   */
export const Projectile = (easing: Easing): Easing => (start, stop, t) => {
  const dy = stop - start;
  // console.log(start, stop, t, start + (-4 * dy * t * t) + (4 * dy * t));
  t = easing(0.0, 1.0, t);
  return start + (-4 * dy * t * t) + (4 * dy * t);
};

/**
   * Apply a user-supplied function to the time value, like Reduct
   * 1.
   */
export const Time = (fn: (t: number) => number): Easing => (start, stop, t) => start + ((stop - start) * fn(t));

/**
   * Tween with a sinusoidal offset value added. The sinusoidal
   * offset's magnitude is itself tweened.
   */
export const Sinusoid = (mag0: number, mag1: number, magEasing: Easing, freq: number): Easing => (start, stop, t) => start + (t * (stop - start))
      + (magEasing(mag0, mag1, t) * Math.sin(2 * Math.PI * t * freq));

/**
   * Tweens that overshoot/undershoot their target.
   * See https://github.com/d3/d3-ease.
   */
export const Anticipate: {
  BackIn: (s: number) => Easing;
  BackOut: (s: number) => Easing;
} = {
  BackIn: (s) => (start, stop, t) => start + ((stop - start)
                   * t * t * (((s + 1) * t) - s)),
  BackOut: (s) => (start, stop, t) => start + ((stop - start)
                   * (((t - 1) * (t - 1) * (((s + 1) * (t - 1)) + s)) + 1)),
};
