/* eslint-disable @typescript-eslint/no-use-before-define */
/**
 * Projectors transform a JSON-ish view specification into a gfx view.
 */
import * as immutable from 'immutable';

import { Im, thunk } from '@/util/im';
import type { ReductNode, NodeMap } from '@/semantics';
import type BaseStage from '@/stage/basestage';

import { SymbolNode } from '@/semantics/defs';
import * as gfx from './core';
import Loader from '../loader';
import * as core from '../semantics/core';
import type {
    DefaultProjectionDef,
    BaseProjectionDef,
    TextProjectionDef,
    ProjectionDef,
    SymbolProjectionDef,
    DynProjectionDef,
    DynPropProjectionDef,
    HboxProjectionDef,
    VboxProjectionDef,
    StickyProjectionDef,
    DecalProjectionDef,
    PreviewProjectionDef,
    ProjectionShape,
    CaseOnProjectionDef,
    CaseKeyProjectionDef,
    SpriteProjectionDef
} from './projection';

const optionFields = [
    'color', 'strokeWhenChild', 'shadowOffset', 'radius', 'padding',
    'notches', 'subexpScale', 'shadow', 'shadowColor', 'horizontalAlign',
    'stroke', 'highlightColor', 'ellipsize'
] as const;

function shapeToProjection(shape?: ProjectionShape) {
    let baseProjection = gfx.roundedRect;
    if (shape === '<>') {
        baseProjection = gfx.hexaRect;
    } else if (shape === 'none') {
        baseProjection = gfx.baseProjection;
    } else if (shape === 'notch') {
        baseProjection = gfx.notchProjection;
    }

    return baseProjection;
}

/**
 * The default projector lays out children in a horizontal box with a
 * rounded or hexagonal background.
 *
 * @alias gfx.projector.defaultProjector
 */
function defaultProjector<N extends ReductNode>(projection: DefaultProjectionDef<N>): ViewFn<N> {
    const options: Partial<BaseProjectionDef<N>> = {};
    const baseProjection = shapeToProjection(projection.shape);

    for (const field of optionFields) {
        if (typeof projection[field] !== 'undefined') {
            options[field] = projection[field];
        }
    }

    return function defaultProjectorFactory(stage, nodes, expr) {
        if (typeof projection.color !== 'undefined') {
            options.color = thunk(projection.color, expr);
        }

        const subexprs = core.getField(projection, 'subexpressions', null, immutable.Map(expr));
        let childrenFunc = (id, state) => subexprs.map((field) => state.getIn(['nodes', id, field]));

        if (projection.fields) {
            const fields = [];
            const fieldNames = thunk(projection.fields, expr);

            for (const field of fieldNames) {
                if (typeof field === 'object') {
                    // TODO: more extensible
                    const textOptions = {};
                    if (field.color) {
                        textOptions.color = field.color;
                    }

                    if (field.field) {
                        fields.push(stage.allocate(gfx.text(expr.get(field.field), textOptions)));
                    } else if (field.text) {
                        fields.push(stage.allocate(gfx.text(field.text, textOptions)));
                    } else {
                        throw `Cannot parse field specification: ${JSON.stringify(field)}`;
                    }
                } else {
                    const match = field.match(/'(.+)'/);
                    if (match) {
                        fields.push(stage.allocate(gfx.text(match[1])));
                    } else if (fields.includes(field)) {
                        fields.push(stage.allocate(gfx.text(expr.get(field))));
                    } else {
                        fields.push(field);
                    }
                }
            }
            childrenFunc = (id, state) => fields.map((field) => {
                if (typeof field === 'number') return field;
                return state.getIn(['nodes', id, field]);
            });
        }

        return gfx.layout.hbox(childrenFunc, options, baseProjection);
    };
}

/**
 * The text projector creates a text view.
 *
 * .. code-block:: js
 *
 *    {
 *        type: "text",
 *        text: textprojection,
 *    }
 *
 * ``textprojection`` is either a string or a function. If a string,
 * it can have substrings like ``{fieldName}`` which will be replaced
 * with ``expr.get("fieldName")``. If a function, it should have the
 * signature ``(state, exprId) => string``.
 *
 * @alias gfx.projector.textProjector
 */
function textProjector<N extends ReductNode>(projection: TextProjectionDef<N>): ViewFn<N> {
    const options: Partial<BaseProjectionDef<N>> = {};

    for (const field of optionFields) {
        if (typeof projection[field] !== 'undefined') {
            options[field] = projection[field];
        }
    }

    return function textProjectorFactory(stage, nodes, expr) {
        const textDefn = projection.text;
        const text = typeof textDefn === 'function' ? textDefn : textDefn.replace(
            /\{([a-zA-Z0-9]+)\}/,
            (match, field) => expr.get(field)
        );
        return gfx.text(text, options);
    };
}

function casesProjector<N extends ReductNode>(
    projection: CaseOnProjectionDef<N> | CaseKeyProjectionDef<N>
): ViewFn<N> {
    const cases: Record<string, ViewFn<N>> = {};
    for (const [caseName, defn] of Object.entries(projection.cases)) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        cases[caseName] = getProjector(defn);
    }

    return function casesProjectorFactory(stage, nodes, expr) {
        // TODO: better error handling if not found
        const key = projection.key?.(nodes, expr) ?? expr.get(projection.on);

        if (typeof cases[key] === 'undefined') {
            throw new Error(`Unrecognized case ${key} for projection of ${projection}`);
        }

        return cases[key](stage, nodes, expr);
    };
}

function symbolProjector(projection: SymbolProjectionDef): ViewFn<SymbolNode> {
    switch (projection.symbol) {
    case 'star':
        return () => gfx.shapes.star();
    case 'rect':
        return () => gfx.shapes.rectangle();
    case 'circle':
        return () => gfx.shapes.circle();
    case 'triangle':
        return () => gfx.shapes.triangle();
    default:
        throw new Error(`Undefined symbol type ${projection.symbol}.`);
    }
}

function dynamicProjector<N extends ReductNode>(projection: DynProjectionDef<N, any>): ViewFn<N> {
    const fieldName = projection.field || 'ty';
    const cases: Record<string, ViewFn<N>> = {};
    cases.__default__ = getProjector(projection.default);
    for (const [caseName, defn] of Object.entries(projection.cases)) {
        cases[caseName] = getProjector(defn);
    }
    return function dynamicProjectorFactory(stage, nodes, expr) {
        const projections = {};
        for (const [key, subprojector] of Object.entries(cases)) {
            projections[key] = subprojector(stage, nodes, expr);
        }
        return gfx.dynamic(projections, fieldName, projection);
    };
}

function dynamicPropertyProjector<N extends ReductNode>(
    projection: DynPropProjectionDef<N, any>
): ViewFn<N> {
    const fieldName = projection.field || 'ty';
    projection.projection.notches = projection.notches;
    const subprojector = getProjector({ ...projection, projection: projection.projection });
    return function dynamicPropertyProjectorFactory(stage, nodes, expr) {
        const subprojection = subprojector(stage, nodes, expr);
        return gfx.dynamicProperty(subprojection, fieldName, projection.fields);
    };
}

function hboxProjector<N extends ReductNode>(projection: HboxProjectionDef<N>): ViewFn<N> {
    const options = {};
    const subprojectors = [];
    const baseProjection = shapeToProjection(projection.shape);

    for (const subprojection of projection.cols) {
        subprojectors.push(getProjector(subprojection));
    }

    for (const field of optionFields) {
        if (typeof projection[field] !== 'undefined') {
            options[field] = projection[field];
        }
    }

    return function hboxProjectorFactory(stage, nodes, expr) {
        if (typeof projection.color !== 'undefined') {
            options.color = thunk(projection.color, expr);
        }

        const subprojections = [];
        for (const subproj of subprojectors) {
            subprojections.push(stage.allocate(subproj(stage, nodes, expr)));
        }
        const childrenFunc = (id, _state) => subprojections.map((projId) => [projId, id]);
        return gfx.layout.hbox(childrenFunc, options, baseProjection);
    };
}

function vboxProjector<N extends ReductNode>(projection: VboxProjectionDef<N>): ViewFn<N> {
    const options = {};
    const subprojectors = [];
    for (const subprojection of projection.rows) {
        subprojectors.push(getProjector(subprojection));
    }

    for (const field of optionFields) {
        if (typeof projection[field] !== 'undefined') {
            options[field] = projection[field];
        }
    }

    return function vboxProjectorFactory(stage, nodes, expr) {
        if (typeof projection.color !== 'undefined') {
            options.color = thunk(projection.color, expr);
        }

        const subprojections = [];
        for (const subproj of subprojectors) {
            subprojections.push(stage.allocate(subproj(stage, nodes, expr)));
        }
        const childrenFunc = (id, _state) => subprojections.map((projId) => [projId, id]);
        return gfx.layout.vbox(childrenFunc, options);
    };
}

function stickyProjector<N extends ReductNode>(projection: StickyProjectionDef<N>): ViewFn<N> {
    for (const field in projection) {
        if (field !== 'type' && field !== 'content' && field !== 'side') {
            projection.content[field] = projection[field];
        }
    }
    const subprojector = getProjector(projection.content);

    return function stickyProjectorFactory(stage, nodes, expr) {
        const inner = subprojector(stage, nodes, expr);
        return gfx.layout.sticky(inner, projection.side);
    };
}

// TODO: generalize all these projectors?
function decalProjector<N extends ReductNode>(projection: DecalProjectionDef<N>): ViewFn<N> {
    const subprojector = getProjector(projection.content);

    return function decalProjectorFactory(stage, nodes, expr) {
        const inner = subprojector(stage, nodes, expr);
        return gfx.decal(inner);
    };
}

function previewProjector<N extends ReductNode>(projection: PreviewProjectionDef<N>): ViewFn<N> {
    const subprojector = getProjector(projection.content);

    return function previewProjectorFactory(stage, nodes, expr) {
        const inner = subprojector(stage, nodes, expr);
        return gfx.layout.previewer(inner);
    };
}

function genericProjector(projection) {
    return function genericProjectorFactory(stage, nodes, expr) {
        const path = projection.view.slice();
        let view = gfx;
        while (path.length > 0) {
            view = view[path.shift()];
        }
        return view(projection.options);
    };
}

function spriteProjector<N extends ReductNode>(projection: SpriteProjectionDef<N>): ViewFn<N> {
    return function spriteProjectorFactory(stage, nodes, expr) {
        const imageName = thunk(projection.image, expr);
        const image = Loader.images[imageName];
        let w = image.naturalWidth;
        let h = image.naturalHeight;

        if (projection.scale) {
            w *= projection.scale;
            h *= projection.scale;
        } else if (projection.size) {
            w = projection.size.w;
            h = projection.size.h;
            if (typeof h === 'undefined') {
                h = (image.naturalHeight / image.naturalWidth) * w;
            } else if (typeof w === 'undefined') {
                w = (image.naturalWidth / image.naturalHeight) * h;
            }
        }

        const size = { w, h };

        return gfx.exprify(gfx.sprite({
            image,
            size
        }));
    };
}

export type View = {}; // TODO
export type ViewFn<N extends ReductNode = ReductNode> =
    (stage: BaseStage, nodes: NodeMap, expr: Im<N>) => View;

/**
 * Given an expression definition, construct a function ``(stage,
 * nodes, expr) => view`` that will construct a view for an expression
 * based on the definition, given the stage and the current set of
 * nodes.
 *
 * @alias gfx.projector.projector
 */
export function getProjector<N extends ReductNode>(definition: ProjectionDef<N>): ViewFn<N> {
    switch (definition.type) {
    case 'default':
        return defaultProjector(definition);
    case 'case':
    case 'cases':
        return casesProjector(definition);
    case 'text':
        return textProjector(definition);
    case 'symbol':
        // can assert conversion b/c if we're here, then N = SymbolNode
        return symbolProjector(definition) as unknown as ViewFn<N>;
    case 'dynamic':
        return dynamicProjector(definition);
    case 'dynamicProperty':
        return dynamicPropertyProjector(definition);
    case 'hbox':
        return hboxProjector(definition);
    case 'vbox':
        return vboxProjector(definition);
    case 'sticky':
        return stickyProjector(definition);
    case 'decal':
        return decalProjector(definition);
    case 'preview':
        return previewProjector(definition);
    case 'generic':
        // TODO: get rid of generic projection, this is poisonous to TypeScript
        return genericProjector(definition);
    case 'sprite':
        return spriteProjector(definition);
    default:
        throw new Error(`Unrecognized projection type ${definition.type}`);
    }
}
