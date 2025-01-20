import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

const initDb = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    console.log('Using URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@')); // Hide credentials in logs
    
    const client = new MongoClient(uri, options);
    await client.connect();
    console.log('Connected to MongoDB Atlas successfully');

    // Verify connection by running a simple command
    await client.db('admin').command({ ping: 1 });
    console.log('Database connection verified');

    // Initialize database with root node if it doesn't exist
    const db = client.db('familyTree');
    const collection = db.collection('nodes');
    
    // Check if root node exists
    const rootNode = await collection.findOne({ id: '1' });
    
    if (!rootNode) {
      // Create root node
      await collection.insertOne({
        id: '1',
        name: 'Beşo',
        children: []
      });
      console.log('Root node created successfully in MongoDB Atlas');
    } else {
      console.log('Root node exists in MongoDB Atlas');
    }

    return client;
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas:', error);
    throw error;
  }
};

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  };

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = initDb();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = initDb();
}

export default clientPromise;
