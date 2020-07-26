import type Clock from '../clock';
import type { Easing } from '../easing';

import { TweenOptions, Tween, TweenStatus } from '.';

export interface InterpolateTweenOptions extends TweenOptions {
    reverse?: boolean;
    repeat?: number;
}

export interface InterpolateTweenProperty<T, K extends keyof T> {
    target: T;
    property: K;
    start: T[K];
    end: T[K];
    easing: Easing;
}

/**
 * A tween that interpolates from a start value to an end value.
 *
 * @augments animate.Tween
 */
export default class InterpolateTween extends Tween<InterpolateTweenOptions> {
  private readonly properties: InterpolateTweenProperty<any, any>[];

  private readonly duration: number;

  private remaining: number;

  private readonly reverse: boolean;

  private repeat: number;

  private reversing: boolean;

  public constructor(
    clock: Clock,
    properties: InterpolateTweenProperty<any, any>[],
    options: InterpolateTweenOptions
  ) {
    super(clock, options);

    this.properties = properties;
    this.duration = options.duration;
    this.remaining = options.duration;
    this.reverse = false;
    this.repeat = 1;
    this.reversing = false;

    if (typeof options.reverse !== 'undefined') {
      this.reverse = options.reverse;
    }

    if (typeof options.repeat !== 'undefined') {
      this.repeat = options.repeat;
    }
  }

  private makeUndo() {
    const properties = [];
    for (const attr of this.properties) {
      properties.push({
        ...attr,
        start: attr.end,
        end: attr.start,
      });
    }
    return new InterpolateTween(this.clock, properties, this.options);
  }

  public update(dt: number) {
    if (this.status !== TweenStatus.Running) {
      return false;
    }

    // Guard against very long time steps (e.g. when paused by a
    // debugger)
    dt %= this.duration;

    if (this.reversing) {
      this.remaining += dt;
    } else {
      this.remaining -= dt;
    }

    let t = Math.max(0, 1 - (this.remaining / this.duration));
    let completed = false;

    if ((!this.reversing && this.remaining <= 0)
          || (this.reversing && this.remaining >= this.duration)) {
      this.repeat -= 1;
      if (this.repeat <= 0) {
        completed = true;
        t = 1.0;
      } else {
        if (this.reverse) {
          this.reversing = !this.reversing;
        } else {
          this.remaining = this.duration;
        }
        t = Math.max(0, 1 - (this.remaining / this.duration));
      }
    }

    for (const attr of this.properties) {
      const {
        target, property, start, end, easing,
      } = attr;
      target[property] = easing(start, end, t);
    }

    if (completed) {
      this.completed();
      return false;
    }
    return true;
  }

  /** Resets properties affected back to their initial value. */
  public undo(animated = false): Tween | null {
    if (animated) {
      const tween = this.makeUndo();
      this.clock.addTween(tween);
      return tween;
    }

    for (const attr of this.properties) {
      const { target, property, start } = attr;
      target[property] = start;
    }

    return null;
  }

  public cancel() {
    this.status = TweenStatus.Completed;
  }

  public completed() {
    for (const attr of this.properties) {
      const {
        target, property, start, end, easing,
      } = attr;
      target[property] = easing(start, end, 1);
    }
    super.completed();
  }
}
