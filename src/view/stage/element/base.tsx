import React, { ReactNode } from 'react';
import cx from 'classnames';

export default function StageElement(props: { children: ReactNode; className?: string }) {
    return (
        <div className={cx('stage-element', props.className)}>
            {props.children}
        </div>
    )
}