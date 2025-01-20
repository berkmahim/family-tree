import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import clientPromise from '../../../lib/mongodb-atlas';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const secret = new TextEncoder().encode(JWT_SECRET);

export async function DELETE(request: Request) {
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

    const { nodeId } = await request.json();

    const client = await clientPromise;
    const db = client.db('familyTree');
    const collection = db.collection('nodes');

    // Find the node to delete
    const nodeToDelete = await collection.findOne({ id: nodeId });
    if (!nodeToDelete) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Don't allow deleting the root node (Beşo)
    if (nodeToDelete.name === 'Beşo') {
      return NextResponse.json({ error: 'Cannot delete root node' }, { status: 400 });
    }

    // Remove this node's ID from its parent's children array
    await collection.updateOne(
      { children: nodeId },
      { $pull: { children: nodeId } }
    );

    // Delete the node
    await collection.deleteOne({ id: nodeId });

    // Get all nodes to update the tree
    const nodes = await collection.find().toArray();

    return NextResponse.json({ success: true, nodes });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json(
      { error: 'Failed to delete node' },
      { status: 500 }
    );
  }
}
