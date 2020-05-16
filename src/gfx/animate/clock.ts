import { Tween, TweenStatus, TweenOptions } from './tween';
import InterpolateTween, { InterpolateTweenProperty } from './tween/interpolate';
import * as Easing from './easing';
import InfiniteTween from './tween/infinite';


type Listener = () => void;

type Animatable = { animating?: number } & object;

/**
 * An animation loop and tween manager.
 */
export default class Clock {
  private readonly listeners: Listener[] = [];

  private readonly tweens: Tween[] = [];

  private running = false;

  private lastTimestamp: number | null = null;

  /**
   * A global scale factor applied to tween durations. This is
   * dynamic, i.e. instead of statically changing the durations
   * of new tweens, this value is multiplied by the delta time
   * used to update tweens. Thus, changing this affects
   * animations in progress. However, it will not dynamically
   * affect :func:`animate.after`, which does scale its duration
   * according to this, but does not readjust its duration
   * afterwards.
   */
  private _scale: number | null = null;

  public constructor() {
      this.listeners = [];
      this.tweens = [];
      this.running = false;
      this.lastTimestamp = null;
  }

  public get scale(): number {
      if (this._scale) {
          return this._scale;
      }
      const el = document.querySelector('#animation-speed-slider') as HTMLInputElement;
      if (el) {
          return parseFloat(el.value);
      }
      return 1;
  }

  public set scale(s) {
      this._scale = s;
  }

  public addUpdateListener(f: Listener) {
      this.listeners.push(f);
  }

  /**
   * Update all tweens by the given delta time. If any tweens are
   * still running, automatically requests a new animation frame,
   * otherwise pauses the clock. This helps save CPU cycles and
   * battery power when no animations are running.
   */
  public tick(time: number) {
      const dt = this.scale * (time - (this.lastTimestamp ?? time));
      const completed = [];
      let running = false;

      for (const t of this.tweens) {
          running = t.update(dt) || running;
          if (t.status === TweenStatus.Completed) {
              completed.push(t);
          }
      }

      for (const t of completed) {
          this.tweens.splice(this.tweens.indexOf(t), 1);
      }

      this.running = this.tweens.length > 0 && running;

      if (this.running) {
          this.lastTimestamp = time;
          window.requestAnimationFrame(this.tick.bind(this));
      } else {
          this.lastTimestamp = null;
      }

      for (const listener of this.listeners) {
          listener();
      }
  }

  /**
   * Add a :class:`InterpolateTween` tween to this clock.
   *
   * @param target - The object whose properties should be tweened.
   * @param properties - A dictionary of property values to
   * be tweened. The RHS should be the final value of the
   * property. It can also be a list, where in order, the list
   * (optionally) contains the start value, the final value, and an
   * easing function to use for just that property. Properties can
   * be nested, e.g. passing ``{ pos: { x: 0 }}`` will tween
   * ``target.pos.x`` to 0.
   * @param options - Various options for the tween. Any
   * options not described here are passed to the tween
   * constructor—see :class:`animate.InterpolateTween`.
   * @returns {animate.InterpolateTween} The tween object.
   */
  public tween<T extends Animatable, V = number>(
      target: T,
      properties: Partial<T>,
      options: TweenOptions<V>
  ): InterpolateTween {
      const duration = options.duration || 300;
      const props: InterpolateTweenProperty<any, any>[] = [];
      const defaultEasing = options.easing || Easing.Linear;
      const setAnimatingFlag = options.setAnimatingFlag ?? true;

      const buildProps = <ST extends object>(
          subTarget: ST,
          subProps: Partial<ST>, easing: Easing.Easing) => {
          for (let [prop, final] of Object.entries(subProps)) {
              let start = null;

              if (Array.isArray(final)) {
                  if (final.length === 2 && typeof final[1] === 'function') {
                      [final, easing] = final;
                  } else if (final.length === 2) {
                      [start, final] = final;
                  } else if (final.length === 3) {
                      [start, final, easing] = final;
                  } else {
                      throw new Error('Tween target can only be array if array is length 2 or 3');
                  }
              }

              if (typeof final === 'number' || typeof final === 'string') {
                  props.push({
                      target: subTarget,
                      property: prop,
                      start: start || subTarget[prop as keyof ST],
                      end: final,
                      easing
                  });
              } else if (final) {
                  // if it's not a number or a string we're assuming it's an object
                  // and not a function or something because who would do something
                  // like that?
                  buildProps(subTarget[prop as keyof ST] as any, final as any, easing);
              }
          }
      };

      buildProps(target, properties, defaultEasing);

      // Set flag so that layout functions know to skip this view,
      // if it is a child. Use counter to allow overlapping tweens.
      if (setAnimatingFlag) {
          if ('animating' in target && typeof target.animating === 'number') {
              target.animating += 1;
          } else {
              target.animating = 1;
          }
      }

      const decrementAnimatingCount = () => {
          if (typeof target.animating === 'number') {
              target.animating -= 1;
          } else {
              target.animating = 0;
          }
      };

      const result = this.addTween(new InterpolateTween(this, props, { duration, ...options }));
      if (setAnimatingFlag) {
          result.then(() => {
              if (options.restTime) {
                  // eslint-disable-next-line @typescript-eslint/no-use-before-define
                  return after(options.restTime);
              }
              return null;
          }).then(() => decrementAnimatingCount());
      }
      return result;
  }

  /**
   * Directly add a tween to this clock.
   *
   * Starts the clock if paused.
   *
   * @param {animate.Tween} t
   */
  public addTween<T extends Tween>(t: T): T {
      this.tweens.push(t);
      if (!this.running) {
          this.start();
      }

      return t;
  }

  /**
   * Start the clock, if paused.
   */
  public start() {
      if (!this.running) {
          this.running = true;
          this.lastTimestamp = window.performance.now();
          window.requestAnimationFrame(this.tick.bind(this));
      }
  }

  /**
   * Cancel all tweens on this clock and stop the clock.
   */
  public cancelAll() {
      this.running = false;
      this.lastTimestamp = null;
      while (this.tweens.length > 0) {
          this.tweens.pop();
      }
  }
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
export function addUpdateListener(f: Listener) {
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
export function tween<T extends object, V = number>(
    target: T,
    properties: Partial<T>,
    options: TweenOptions<V>
) {
    return clock.tween<T, V>(target, properties, options);
}

/**
 * Add an infinite tween to the default clock.
 *
 * @param {Function} updater - The update function. See
 * :class:`~animate.InfiniteTween`.
 * @param {Object} options
 */
export function infinite(updater: (dt: number) => void, options: TweenOptions) {
    return clock.addTween(new InfiniteTween(clock, updater, options));
}

export function chain<T extends object>(target: T, ...properties: [Partial<T>, TweenOptions][]) {
    let base = null;
    for (const [prop, options] of properties) {
        if (base === null) {
            base = tween(target, prop, options);
        } else {
            base = base.then(() => tween(target, prop, options));
        }
    }

    return base;
}

/**
 * A helper function to resolve a Promise after a specified delay.
 *
 * @param ms The delay in milliseconds.
 * @param c The clock to use to scale this delay.
 */
export function after(ms: number, c = clock) {
    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve();
        }, ms / c.scale);
    });
}
