export interface Entity {
  name: string;
  primaryKey: Attribute[];
  attributes: Attribute[];
  weak: boolean;
  div: HTMLElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ForeignKey {
  entity: string;
  attributeName: string;
  relName?: string;
}

export interface Attribute {
  name: string;
  many: boolean;
  type: string;
  optional: boolean;
  isPK: boolean;
  fkTarget?: ForeignKey;
}

export interface Generalization {
  generic: string;
  categories: string[];
  discriminator?: string;
  complete: boolean;
}

export interface Relationship {
  source: ForeignKey;
  target: ForeignKey;
}
