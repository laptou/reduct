import type { BaseNode } from '..';
import type { NodeDef } from './base';

export interface MissingNode extends BaseNode {
    type: 'missing';
}

/**
 * Standard definition for missing expression.
 */
export const missing: NodeDef<MissingNode> = {
    kind: 'placeholder',
    fields: [],
    subexpressions: [],
    locked: false,
    alwaysTargetable: true,
    type: () => ({
        types: new Map(),
        complete: false
    }),
    projection: {
        type: 'dynamic',
        resetFields: ['padding'],
        default: {
            type: 'default',
            shape: '()',
            color: '#555',
            shadowOffset: -2,
            radius: 22,
            padding: {
                left: 20,
                right: 20,
                inner: 0
            }
        },
        cases: {
            boolean: {
                type: 'default',
                shape: '<>',
                color: '#555',
                shadowOffset: -2,
                padding: {
                    left: 37.5,
                    right: 37.5,
                    inner: 0
                }
            }
        }
    }
};
