import type { BaseNode, NodeId, NodeMap } from '@/semantics';
import type { Im, Thunk } from '@/util/im';
import type { RState } from '@/reducer/state';
import { SymbolNode } from '@/semantics/defs';

export interface ProjectionPadding {
    left: number;
    right: number;
    inner: number;
    top: number;
    bottom: number;
}

export type ProjectionShape = '<>' | '()' | 'notch' | 'none';

export type ProjectionDef<N extends BaseNode> =
    DefaultProjectionDef<N> |
    VboxProjectionDef<N> |
    HboxProjectionDef<N> |
    TextProjectionDef<N> |
    DynPropProjectionDef<N, any> |
    DynProjectionDef<N, any> |
    CaseOnProjectionDef<N> |
    CaseKeyProjectionDef<N> |
    StickyProjectionDef<N> |
    DecalProjectionDef<N> |
    PreviewProjectionDef<N> |
    SpriteProjectionDef<N> |
    SymbolProjectionDef;

export interface BaseProjectionDef<N> {
    color?: Thunk<[Im<N>], string>;
    strokeWhenChild?: boolean;
    shadowOffset?: number;
    radius?: number;
    padding?: ProjectionPadding;
    notches?: string;
    subexpScale?: string;
    shadow?: string;
    shadowColor?: string;
    horizontalAlign?: string;
    stroke?: Thunk<[Im<N>], string>;
    highlightColor?: Thunk<[Im<N>], string>;
    ellipsize?: boolean;
}

export interface DefaultProjectionDef<N extends BaseNode> extends BaseProjectionDef<N> {
    type: 'default';
    shape?: ProjectionShape;
    fields?: Thunk<[Im<N>], string[]>;
}

export interface VboxProjectionDef<N extends BaseNode> extends BaseProjectionDef<N> {
    type: 'vbox';
    rows: ProjectionDef<N>[];

    shape?: ProjectionShape;
}

export interface HboxProjectionDef<N extends BaseNode> extends BaseProjectionDef<N> {
    type: 'hbox';
    cols: ProjectionDef<N>[];

    shape?: ProjectionShape;
}

export interface TextProjectionDef<N extends BaseNode> extends BaseProjectionDef<N> {
    type: 'text';
    text: string;
}

export interface DynPropProjectionDef<
    N extends BaseNode,
    P extends ProjectionDef<N>
> extends BaseProjectionDef<N> {
    type: 'dynamicProperty';
    field(state: Im<RState>, nodeId: NodeId): string;
    fields: Record<string, Record<string, (proj: P) => void>>;
    projection: P;
}

// TODO: this seems redundant to the case projection
// consider eliminating
export interface DynProjectionDef<
    N extends BaseNode,
    P extends ProjectionDef<N>
> extends BaseProjectionDef<N> {
    type: 'dynamic';
    field(state: Im<RState>, nodeId: NodeId): string;
    cases: Record<string, P>;
    default: P;

    onKeyChange?: any; // TODO
    resetFields?: string[];
}

export interface StickyProjectionDef<N extends BaseNode> extends BaseProjectionDef<N> {
    type: 'sticky';
    // TODO: enum
    side: string;
    content: ProjectionDef<N>;
}

export interface PreviewProjectionDef<N extends BaseNode> extends BaseProjectionDef<N> {
    type: 'preview';
    content: ProjectionDef<N>;
}

export interface DecalProjectionDef<N extends BaseNode> extends BaseProjectionDef<N> {
    type: 'decal';
    content: ProjectionDef<N>;
}

export interface CaseOnProjectionDef<
    N extends BaseNode,
    K extends keyof N = keyof N
> extends BaseProjectionDef<N> {
    type: 'case' | 'cases';
    on?: K;
    cases: Record<N[K] extends (string | number | symbol) ? N[K] : never, ProjectionDef<N>>;
}

export interface CaseKeyProjectionDef<
    N extends BaseNode,
    K extends string | number | symbol = string | number | symbol
> extends BaseProjectionDef<N> {
    type: 'case' | 'cases';
    key?(nodes: NodeMap, expr: Im<N>): K;
    cases: Record<K, ProjectionDef<N>>;
}

export interface SymbolProjectionDef extends BaseProjectionDef<SymbolNode> {
    type: 'symbol';
    symbol: 'star' | 'circle' | 'triangle' | 'rect';
}

export interface SpriteProjectionDef<N extends BaseNode> extends BaseProjectionDef<N> {
    type: 'sprite';
    image: Thunk<[Im<N>], string>;
    scale?: number;
    size?: { w: number; h: number };
}
