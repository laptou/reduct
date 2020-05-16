import { RNode, RId } from '@/semantics';
import { Im, ImMap, Thunk } from '@/util/im';
import { RState } from '@/reducer/state';

export interface ProjectionPadding {
    left: number;
    right: number;
    inner: number;
    top: number;
    bottom: number;
}

export type ProjectionTemplate<N extends RNode> =
    DefaultProjectionTemplate<N> |
    VboxProjectionTemplate<N> |
    HboxProjectionTemplate<N> |
    DynamicPropertyProjectionTemplate<N, any> |
    DynamicProjectionTemplate<N, any> |
    CaseProjectionTemplate<N> |
    StickyProjectionTemplate<N> |
    PreviewProjectionTemplate<N> |
    SymbolProjectionTemplate;

export interface DefaultProjectionTemplate<N extends RNode> {
    type: 'default';
    color?: Thunk<[RNode], string>;
    shape?: '<>' | '()' | 'notch' | 'none';
    radius?: number;
    fields?: Thunk<[N], string[]>;
    padding?: ProjectionPadding;
    subexpScale?: number;
}

export interface VboxProjectionTemplate<N extends RNode> {
    type: 'vbox';
    color?: Thunk<[RNode], string>;
    horizontalAlign: number;
    ellipsize: boolean;
    padding?: ProjectionPadding;
    subexpScale?: number;
    rows: ProjectionTemplate<N>[];
}

export interface HboxProjectionTemplate<N extends RNode> {
    type: 'hbox';
    color?: Thunk<[RNode], string>;
    horizontalAlign?: number;
    ellipsize?: boolean;
    padding?: ProjectionPadding;
    subexpScale?: number;
    cols: ProjectionTemplate<N>[];
}

export interface DynamicPropertyProjectionTemplate<
    N extends RNode,
    P extends ProjectionTemplate<N>
    > {
    type: 'dynamicProperty';
    field(state: Im<RState>, nodeId: RId): string;
    fields: Record<string, Record<string, (proj: P) => void>>;
    projection: P;
}

// TODO: this seems redundant to the case projection
// consider eliminating
export interface DynamicProjectionTemplate<
    N extends RNode,
    P extends ProjectionTemplate<N>
    > {
    type: 'dynamic';
    field(state: Im<RState>, nodeId: RId): string;
    cases: Record<string, Record<string, P>>;
    default: P;

    onKeyChange?: any; // TODO
    resetFields?: string[];
}

export interface StickyProjectionTemplate<N extends RNode> {
    type: 'sticky';
    // TODO: enum
    side: string;
    content: ProjectionTemplate<N>;
}

export interface PreviewProjectionTemplate<N extends RNode> {
    type: 'preview';
    content: ProjectionTemplate<N>;
}

export interface CaseProjectionTemplate<
    N extends RNode,
    K extends string | number | symbol = string | number | symbol
    > {
    type: 'case';
    key?(nodes: ImMap<RId, Im<RNode>>, expr: Im<N>): K;
    on?: string;
    cases: Record<K, ProjectionTemplate<N>>;
}

export interface SymbolProjectionTemplate {
    type: 'symbol';
    symbol: 'star' | 'circle' | 'triangle' | 'rect';
}
