export interface FamilyMember {
  id: string;
  name: string;
  birthYear?: number;
  deathYear?: number;
  spouses?: string[];
  children?: string[];
  parentId?: string;
}

export interface FamilyLink {
  source: string;
  target: string;
  type: 'parent-child' | 'marriage';
}

const familyData: { nodes: FamilyMember[]; links: FamilyLink[] } = {
  nodes: [
    { id: '1', name: 'Beşo' },
    { id: '2', name: 'Child 1' },
    { id: '3', name: 'Child 2' },
    { id: '4', name: 'Child 3' },
    { id: '5', name: 'Child 4' },
    { id: '6', name: 'Child 5' },
    { id: '7', name: 'Child 6' },
  ],
  links: [
    { source: '1', target: '2', type: 'parent-child' },
    { source: '1', target: '3', type: 'parent-child' },
    { source: '1', target: '4', type: 'parent-child' },
    { source: '1', target: '5', type: 'parent-child' },
    { source: '1', target: '6', type: 'parent-child' },
    { source: '1', target: '7', type: 'parent-child' },
  ]
};

export default familyData;
