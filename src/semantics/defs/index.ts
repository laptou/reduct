export enum SemanticItemKind {
  Expr = 'expression'
}

export interface SemanticDefinition {
  kind: SemanticItemKind;
  fields: any[];
  subexpressions: string[];
  projection: ProjectionDefinition;
}

export interface ProjectionDefinition {
  
}