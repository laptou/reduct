export enum SemanticItemKind {
  Expr = 'expression',
  Placeholder = 'placeholder',
  Value = 'value'
}

export interface SemanticDefinition {
  kind: SemanticItemKind;
  fields: string[];
  subexpressions: string[];
  projection: ProjectionDefinition;
}

export interface ProjectionDefinition {
  
}