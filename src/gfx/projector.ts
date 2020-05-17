/**
 * Projectors transform a JSON-ish view specification into a gfx view.
 */
import * as immutable from 'immutable';
import * as gfx from './core';
import Loader from '../loader';
import * as core from '../semantics/core';
import BaseStage from '@/stage/basestage';
import { ImMap, Im } from '@/util/im';
import { BaseNode, NodeId, NodeMap, ReductNode } from '@/semantics';
import { NodeDef } from "@/semantics/NodeDef";

const optionFields = [
    'color', 'strokeWhenChild', 'shadowOffset', 'radius', 'padding',
    'notches', 'subexpScale', 'shadow', 'shadowColor', 'horizontalAlign',
    'stroke', 'highlightColor', 'ellipsize'
];

function shapeToProjection(shape, options) {
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
function defaultProjector(definition: NodeDef<ReductNode>) {
    const options = {};
    const baseProjection = shapeToProjection(definition.projection.shape, options);

    for (const field of optionFields) {
        if (typeof definition.projection[field] !== 'undefined') {
            options[field] = definition.projection[field];
        }
    }

    return function defaultProjectorFactory(stage, nodes, expr) {
        if (typeof definition.projection.color !== 'undefined') {
            const colorDefn = definition.projection.color;
            options.color = typeof colorDefn === 'function' ? colorDefn(expr) : colorDefn;
        }

        const subexprs = core.getField(definition, 'subexpressions', null, immutable.Map(expr));
        let childrenFunc = (id, state) => subexprs.map((field) => state.getIn(['nodes', id, field]));

        if (definition.projection.fields) {
            const fields = [];
            const fieldNames = core.getField(definition.projection, 'fields', expr);
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
                    } else if (definition.fields.indexOf(field) > -1) {
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
 *        text: textDefinition,
 *    }
 *
 * ``textDefinition`` is either a string or a function. If a string,
 * it can have substrings like ``{fieldName}`` which will be replaced
 * with ``expr.get("fieldName")``. If a function, it should have the
 * signature ``(state, exprId) => string``.
 *
 * @alias gfx.projector.textProjector
 */
function textProjector(definition) {
    const options = {};

    for (const field of optionFields) {
        if (typeof definition.projection[field] !== 'undefined') {
            options[field] = definition.projection[field];
        }
    }

    return function textProjectorFactory(stage, nodes, expr) {
        const textDefn = definition.projection.text;
        const text = typeof textDefn === 'function' ? textDefn : textDefn.replace(
            /\{([a-zA-Z0-9]+)\}/,
            (match, field) => expr.get(field)
        );
        return gfx.text(text, options);
    };
}

function casesProjector(definition) {
    const cases = {};
    for (const [caseName, defn] of Object.entries(definition.projection.cases)) {
        cases[caseName] = projector({ ...definition, projection: defn });
    }
    return function casesProjectorFactory(stage, nodes, expr) {
        // TODO: better error handling if not found
        let key = expr.get(definition.projection.on);
        if (definition.projection.key) {
            key = definition.projection.key(nodes, expr);
        }
        if (typeof cases[key] === 'undefined') {
            throw `Unrecognized case ${key} for projection of ${definition}`;
        }
        return cases[key](stage, expr);
    };
}

function symbolProjector(definition) {
    switch (definition.projection.symbol) {
    case 'star':
        return () => gfx.shapes.star();
    case 'rect':
        return () => gfx.shapes.rectangle();
    case 'circle':
        return () => gfx.shapes.circle();
    case 'triangle':
        return () => gfx.shapes.triangle();
    default:
        throw `Undefined symbol type ${definition.symbol}.`;
    }
}

function dynamicProjector(definition) {
    const fieldName = definition.projection.field || 'ty';
    const cases = {};
    cases.__default__ = projector({ ...definition, projection: definition.projection.default });
    for (const [caseName, defn] of Object.entries(definition.projection.cases)) {
        cases[caseName] = projector({ ...definition, projection: defn });
    }
    return function dynamicProjectorFactory(stage, nodes, expr) {
        const projections = {};
        for (const [key, subprojector] of Object.entries(cases)) {
            projections[key] = subprojector(stage, nodes, expr);
        }
        return gfx.dynamic(projections, fieldName, definition.projection);
    };
}

function dynamicPropertyProjector(definition) {
    const fieldName = definition.projection.field || 'ty';
    definition.projection.projection.notches = definition.projection.notches;
    const subprojector = projector({ ...definition, projection: definition.projection.projection });
    return function dynamicPropertyProjectorFactory(stage, nodes, expr) {
        const subprojection = subprojector(stage, nodes, expr);
        return gfx.dynamicProperty(subprojection, fieldName, definition.projection.fields);
    };
}

function hboxProjector(definition) {
    const options = {};
    const subprojectors = [];
    const baseProjection = shapeToProjection(definition.projection.shape, options);

    for (const subprojection of definition.projection.cols) {
        subprojectors.push(projector({ ...definition, projection: subprojection }));
    }

    for (const field of optionFields) {
        if (typeof definition.projection[field] !== 'undefined') {
            options[field] = definition.projection[field];
        }
    }

    return function hboxProjectorFactory(stage, nodes, expr) {
        if (typeof definition.projection.color !== 'undefined') {
            const colorDefn = definition.projection.color;
            options.color = typeof colorDefn === 'function' ? colorDefn(expr) : colorDefn;
        }

        const subprojections = [];
        for (const subproj of subprojectors) {
            subprojections.push(stage.allocate(subproj(stage, nodes, expr)));
        }
        const childrenFunc = (id, _state) => subprojections.map((projId) => [projId, id]);
        return gfx.layout.hbox(childrenFunc, options, baseProjection);
    };
}

function vboxProjector(definition) {
    const options = {};
    const subprojectors = [];
    for (const subprojection of definition.projection.rows) {
        subprojectors.push(projector({ ...definition, projection: subprojection }));
    }

    for (const field of optionFields) {
        if (typeof definition.projection[field] !== 'undefined') {
            options[field] = definition.projection[field];
        }
    }

    return function vboxProjectorFactory(stage, nodes, expr) {
        if (typeof definition.projection.color !== 'undefined') {
            const colorDefn = definition.projection.color;
            options.color = typeof colorDefn === 'function' ? colorDefn(expr) : colorDefn;
        }

        const subprojections = [];
        for (const subproj of subprojectors) {
            subprojections.push(stage.allocate(subproj(stage, nodes, expr)));
        }
        const childrenFunc = (id, _state) => subprojections.map((projId) => [projId, id]);
        return gfx.layout.vbox(childrenFunc, options);
    };
}

function stickyProjector(definition) {
    for (const field in definition.projection) {
        if (field !== 'type' && field !== 'content' && field !== 'side') {
            definition.projection.content[field] = definition.projection[field];
        }
    }
    const subprojector = projector({ ...definition, projection: definition.projection.content });

    return function stickyProjectorFactory(stage, nodes, expr) {
        const inner = subprojector(stage, nodes, expr);
        return gfx.layout.sticky(inner, definition.projection.side);
    };
}

// TODO: generalize all these projectors?
function decalProjector(definition) {
    const subprojector = projector({ ...definition, projection: definition.projection.content });

    return function decalProjectorFactory(stage, nodes, expr) {
        const inner = subprojector(stage, nodes, expr);
        return gfx.decal(inner);
    };
}

function previewProjector(definition) {
    const subprojector = projector({ ...definition, projection: definition.projection.content });

    return function previewProjectorFactory(stage, nodes, expr) {
        const inner = subprojector(stage, nodes, expr);
        return gfx.layout.previewer(inner);
    };
}

function genericProjector(definition) {
    return function genericProjectorFactory(stage, nodes, expr) {
        const path = definition.projection.view.slice();
        let view = gfx;
        while (path.length > 0) {
            view = view[path.shift()];
        }
        return view(definition.projection.options);
    };
}

function spriteProjector(definition) {
    return function spriteProjectorFactory(stage, nodes, expr) {
        const imageDefn = definition.projection.image;
        const InnerImage = typeof imageDefn === 'function' ? imageDefn(expr) : imageDefn;


        const image = Loader.images[InnerImage];
        let w = image.naturalWidth;
        let h = image.naturalHeight;

        if (definition.projection.scale) {
            w *= definition.projection.scale;
            h *= definition.projection.scale;
        } else if (definition.projection.size) {
            w = definition.projection.size.w;
            h = definition.projection.size.h;
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
export type ViewFn = (stage: BaseStage, nodes: NodeMap, expr: Im<ReductNode>) => View;

/**
 * Given an expression definition, construct a function ``(stage,
 * nodes, expr) => view`` that will construct a view for an expression
 * based on the definition, given the stage and the current set of
 * nodes.
 *
 * @alias gfx.projector.projector
 */
export function projector(definition: NodeDef<ReductNode>): ViewFn {
    switch (definition.projection.type) {
    case 'default':
        return defaultProjector(definition);
    case 'case':
    case 'cases':
        return casesProjector(definition);
    case 'text':
        return textProjector(definition);
    case 'symbol':
        return symbolProjector(definition);
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
        return genericProjector(definition);
    case 'sprite':
        return spriteProjector(definition);
    default:
        throw new Error(`Unrecognized projection type ${definition.type}`);
    }
}
