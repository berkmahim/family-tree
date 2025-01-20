import { NextResponse } from 'next/server';
import clientPromise from '../../lib/mongodb-atlas';
import { FamilyNode } from '../../models/FamilyNode';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('familyTree');
    const collection = db.collection('nodes');

    // Get all nodes
    const nodes = await collection.find().toArray();

    // If no nodes exist, create the root node
    if (nodes.length === 0) {
      const rootNode: FamilyNode = {
        id: '1',
        name: 'Beşo',
        children: []
      };

      await collection.insertOne(rootNode);
      console.log('Created root node in family route');
      return NextResponse.json({ nodes: [rootNode], links: [] });
    }

    console.log('Found nodes:', nodes);

    // Create links based on parent-child relationships
    const links = nodes.reduce((acc: any[], node: FamilyNode) => {
      node.children.forEach((childId: string) => {
        acc.push({
          source: node.id,
          target: childId
        });
      });
      return acc;
    }, []);

    console.log('Generated links:', links);

    return NextResponse.json({ nodes, links });
  } catch (error) {
    console.error('Error fetching family data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch family data' },
      { status: 500 }
    );
  }
}
