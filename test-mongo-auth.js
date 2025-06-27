const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://nsuvorovv22:flkitXVePO4knaiC@cluster0.wbygnpt.mongodb.net/babel-books?retryWrites=true&w=majority';

async function testConnection() {
  console.log('Testing MongoDB connection...');
  
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    // List databases
    const databasesList = await client.db().admin().listDatabases();
    console.log('Databases:');
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
    
    await client.close();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testConnection();