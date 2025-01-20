import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import clientPromise from '../../../lib/mongodb-atlas';
import { FamilyNode } from '../../../models/FamilyNode';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const secret = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    // Verify admin token
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await jose.jwtVerify(token.value, secret);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { parentId } = await request.json();

    const client = await clientPromise;
    const db = client.db('familyTree');
    const collection = db.collection('nodes');

    // Find the parent node
    const parentNode = await collection.findOne({ id: parentId });
    if (!parentNode) {
      return NextResponse.json({ error: 'Parent node not found' }, { status: 404 });
    }

    // Create new node
    const newNodeId = Date.now().toString();
    const newNode: FamilyNode = {
      id: newNodeId,
      name: 'New Member',
      parentId,
      children: []
    };

    // Add new node to collection
    await collection.insertOne(newNode);

    // Update parent's children array
    await collection.updateOne(
      { id: parentId },
      { $push: { children: newNodeId } }
    );

    return NextResponse.json({ success: true, node: newNode });
  } catch (error) {
    console.error('Error adding node:', error);
    return NextResponse.json(
      { error: 'Failed to add node' },
      { status: 500 }
    );
  }
}
