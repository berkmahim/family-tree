import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import clientPromise from '../../../lib/mongodb-atlas';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const secret = new TextEncoder().encode(JWT_SECRET);

export async function PATCH(request: Request) {
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

    const { nodeId, name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('familyTree');
    const collection = db.collection('nodes');

    // Find the node to update
    const nodeToUpdate = await collection.findOne({ id: nodeId });
    if (!nodeToUpdate) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Update the node name
    await collection.updateOne(
      { id: nodeId },
      { $set: { name: name.trim() } }
    );

    // Get the updated node
    const updatedNode = await collection.findOne({ id: nodeId });

    return NextResponse.json({ success: true, node: updatedNode });
  } catch (error) {
    console.error('Error updating node:', error);
    return NextResponse.json(
      { error: 'Failed to update node' },
      { status: 500 }
    );
  }
}
