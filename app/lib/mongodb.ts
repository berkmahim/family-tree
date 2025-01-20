import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!global._mongoClientPromise) {
  const initDb = async () => {
    try {
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      client = new MongoClient(uri, options);
      await client.connect();
      
      // Initialize with root node
      const db = client.db('familyTree');
      const collection = db.collection('nodes');
      
      const rootNode = await collection.findOne({ name: 'Beşo' });
      if (!rootNode) {
        await collection.insertOne({
          id: '1',
          name: 'Beşo',
          children: []
        });
      }
      
      return client;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  };

  global._mongoClientPromise = initDb();
}

clientPromise = global._mongoClientPromise;

export default clientPromise;
