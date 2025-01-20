export interface FamilyNode {
  id: string;
  name: string;
  parentId?: string;
  children?: string[];
  spouses?: string[];
  birthYear?: number;
  deathYear?: number;
}

export interface FamilyLink {
  source: string;
  target: string;
  type: 'parent-child' | 'marriage';
}
