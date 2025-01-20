const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

async function initializeDatabase(mongoUri: string) {
  let client: any;
  try {
    console.log('Connecting to MongoDB...');
    // Only log the redacted URI if it exists
    const redactedUri = mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@');
    console.log('Using URI:', redactedUri);
    
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log('Connected successfully');

    const db = client.db('familyTree');
    const collection = db.collection('nodes');

    // Check if root node exists
    const rootNode = await collection.findOne({ id: '1' });

    if (!rootNode) {
      console.log('Creating root node...');
      await collection.insertOne({
        id: '1',
        name: 'Beşo',
        children: []
      });
      console.log('Root node created successfully');
    } else {
      console.log('Root node already exists');
    }

    // List all nodes
    console.log('\nCurrent nodes in database:');
    const nodes = await collection.find().toArray();
    console.log(JSON.stringify(nodes, null, 2));
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\nDatabase connection closed');
    }
  }
  console.log('\nDatabase initialization complete');
}

initializeDatabase(uri);
