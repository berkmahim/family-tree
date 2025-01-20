import { NextResponse } from 'next/server';
import clientPromise from '../../lib/mongodb';
import { FamilyNode } from '../../models/FamilyNode';

export async function GET() {
  try {
    console.log('Attempting to connect to MongoDB...');
    const client = await clientPromise;
    console.log('Connected to MongoDB successfully');

    const db = client.db('familyTree');
    const collection = db.collection('nodes');

    console.log('Checking for root node...');
    const rootNode = await collection.findOne({ name: 'Beşo' });
    
    if (!rootNode) {
      console.log('Root node not found, creating it...');
      // Create root node
      const beso: FamilyNode = {
        id: '1',
        name: 'Beşo',
        children: []
      };

      await collection.insertOne(beso);
      console.log('Root node created successfully');
      return NextResponse.json({ message: 'Database initialized with root node' });
    }

    console.log('Root node already exists');
    return NextResponse.json({ message: 'Root node already exists' });
  } catch (error) {
    console.error('Detailed error in database initialization:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
