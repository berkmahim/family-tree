'use client';

import dynamic from 'next/dynamic';

const FamilyTree = dynamic(() => import('./FamilyTree'), {
  ssr: false
});

export default function ClientWrapper() {
  return <FamilyTree />;
}
