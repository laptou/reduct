import type Clock from '../clock';
import { Easing, Linear } from '../easing';

export enum TweenStatus {
    Running,
    Paused,
    Completed
}

export type TweenOptions<T = number> = {
    /**
     * The duration of the tween. Defaults to `300`.
     */
    duration: number;

    /**
     * The easing function to use. Defaults to linear.
     */
    easing?: Easing<T>;

    /**
     * If given, an amount of
     * time to wait before decrementing the ``animating`` counter on
     * ``target``. Some views use this counter to avoid performing
     * layout on children that are being animated, so that the
     * animation is not overridden by the view.
     */
    restTime?: number;

    /** Don't set the``animating`` counter. */
    setAnimatingFlag?: boolean;

    callback?: () => void;
};


/**
 * The base class for a tween.
 */
export abstract class Tween<O extends TweenOptions = TweenOptions> {
    /**
     * The underlying Promise object of this tween, which is
     * resolved when the tween finishes.
     */
    private readonly _promise: Promise<void>;

    private readonly _options: TweenOptions;

    private resolve!: () => void;

    private reject!: () => void;

    public clock: Clock;

    public status: TweenStatus;

    public constructor(clock: Clock, options?: O) {
      this._options = {
        duration: 300,
        easing: Linear,
        ...options, 
      };

      this._promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });

      this.clock = clock;
      this.status = TweenStatus.Running;
    }

    protected get options(): O { return this._options as O; }

    /**
     * A convenience function to register a callback for when the
     * tween finishes.
     * @returns {Promise}
     */
    public then<T>(
      fulfilled: (() => T | PromiseLike<T>),
      rejected?: (() => any | PromiseLike<any>)
    ) {
      return this._promise.then(fulfilled, rejected);
    }

    /**
     * Pause this tween and resume execution after a specified delay.
     * @param {number} ms
     * @returns The tween itself.
     */
    public delay(ms: number) {
      // TODO: respect Clock.scale
      this.status = TweenStatus.Paused;
      setTimeout(() => {
        this.status = TweenStatus.Running;
        this.clock.start();
      }, ms);
      return this;
    }

    /**
     * Force this tween to mark itself as completed.
     */
    public completed() {
      this.status = TweenStatus.Completed;
      this.resolve();

      if (this.options.callback) {
        this.options.callback();
      }
    }

    public abstract update(dt: number): boolean;
}
