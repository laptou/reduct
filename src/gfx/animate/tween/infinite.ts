import type Clock from '../clock';
import { Tween, TweenStatus, TweenOptions } from '.';


/**
 * A tween that continues running until explicitly stopped.
 *
 * @param clock
 * @param {Function} updater - A function that is called on every tick
 * with the delta-time value. It can return ``true`` to stop running.
 */
export default class InfiniteTween extends Tween {
  protected updater: (dt: number) => void;

    protected stopped: boolean;

    public constructor(clock: Clock, updater: (dt: number) => void, options: TweenOptions) {
        super(clock, options);

        this.updater = updater;
        this.stopped = false;
    }

    public update(dt: number) {
        if (this.status !== TweenStatus.Running) {
            return false;
        }

        const finished = this.stopped || this.updater(dt);
        if (finished) {
            this.completed();
            return false;
        }

        return true;
    }

    /**
     * Stop running this infinite tween.
     */
    public stop() {
        this.stopped = true;
    }
}
