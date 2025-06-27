// Test MongoDB connection with provided credentials
const { MongoClient } = require('mongodb');

// MongoDB URI - trying with 'server' username as shown in mongosh command
const uri = 'mongodb+srv://server:flkitXVePO4knaiC@cluster0.wbygnpt.mongodb.net/babel-books?retryWrites=true&w=majority';

async function testConnection() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await client.connect();
    
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test database access
    const db = client.db('babel-books');
    const collections = await db.listCollections().toArray();
    console.log('📚 Collections:', collections.map(c => c.name));
    
    // Test write access
    const testCollection = db.collection('test');
    const result = await testCollection.insertOne({ 
      test: true, 
      timestamp: new Date() 
    });
    console.log('✍️  Write test successful:', result.insertedId);
    
    // Clean up
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('🧹 Cleanup complete');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.close();
    console.log('👋 Connection closed');
  }
}

testConnection();