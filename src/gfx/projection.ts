import { BaseNode, NodeId } from '@/semantics';
import { Im, ImMap, Thunk } from '@/util/im';
import { RState } from '@/reducer/state';

export interface ProjectionPadding {
    left: number;
    right: number;
    inner: number;
    top: number;
    bottom: number;
}

export type ProjectionTemplate<N extends BaseNode> =
    DefaultProjectionTemplate<N> |
    VboxProjectionTemplate<N> |
    HboxProjectionTemplate<N> |
    DynamicPropertyProjectionTemplate<N, any> |
    DynamicProjectionTemplate<N, any> |
    CaseProjectionTemplate<N> |
    StickyProjectionTemplate<N> |
    PreviewProjectionTemplate<N> |
    SymbolProjectionTemplate;

export interface DefaultProjectionTemplate<N extends BaseNode> {
    type: 'default';
    color?: Thunk<[BaseNode], string>;
    shape?: '<>' | '()' | 'notch' | 'none';
    radius?: number;
    fields?: Thunk<[N], string[]>;
    padding?: ProjectionPadding;
    subexpScale?: number;
}

export interface VboxProjectionTemplate<N extends BaseNode> {
    type: 'vbox';
    color?: Thunk<[BaseNode], string>;
    horizontalAlign: number;
    ellipsize: boolean;
    padding?: ProjectionPadding;
    subexpScale?: number;
    rows: ProjectionTemplate<N>[];
}

export interface HboxProjectionTemplate<N extends BaseNode> {
    type: 'hbox';
    color?: Thunk<[BaseNode], string>;
    horizontalAlign?: number;
    ellipsize?: boolean;
    padding?: ProjectionPadding;
    subexpScale?: number;
    cols: ProjectionTemplate<N>[];
}

export interface DynamicPropertyProjectionTemplate<
    N extends BaseNode,
    P extends ProjectionTemplate<N>
    > {
    type: 'dynamicProperty';
    field(state: Im<RState>, nodeId: NodeId): string;
    fields: Record<string, Record<string, (proj: P) => void>>;
    projection: P;
}

// TODO: this seems redundant to the case projection
// consider eliminating
export interface DynamicProjectionTemplate<
    N extends BaseNode,
    P extends ProjectionTemplate<N>
    > {
    type: 'dynamic';
    field(state: Im<RState>, nodeId: NodeId): string;
    cases: Record<string, Record<string, P>>;
    default: P;

    onKeyChange?: any; // TODO
    resetFields?: string[];
}

export interface StickyProjectionTemplate<N extends BaseNode> {
    type: 'sticky';
    // TODO: enum
    side: string;
    content: ProjectionTemplate<N>;
}

export interface PreviewProjectionTemplate<N extends BaseNode> {
    type: 'preview';
    content: ProjectionTemplate<N>;
}

export interface CaseProjectionTemplate<
    N extends BaseNode,
    K extends string | number | symbol = string | number | symbol
    > {
    type: 'case';
    key?(nodes: NodeMap, expr: Im<N>): K;
    on?: string;
    cases: Record<K, ProjectionTemplate<N>>;
}

export interface SymbolProjectionTemplate {
    type: 'symbol';
    symbol: 'star' | 'circle' | 'triangle' | 'rect';
}
