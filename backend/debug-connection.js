// Quick script to test and debug MongoDB connection
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load production environment variables
dotenv.config({ path: './.env.production' });

console.log('=== MongoDB Connection Debug ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGO_URI:', process.env.MONGO_URI ? 
  process.env.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//[USER]:[PASSWORD]@') : 'NOT SET');

async function testConnection() {
  try {
    console.log('\nAttempting to connect to MongoDB...');
    
    // Set a shorter timeout for testing
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // 15 seconds
      connectTimeoutMS: 15000,
    });
    
    console.log('✅ MongoDB connection successful!');
    
    // Test if we can list databases
    const admin = mongoose.connection.db.admin();
    const result = await admin.listDatabases();
    console.log('Available databases:', result.databases.map(db => db.name));
    
    // Test basic query
    console.log('\nTesting basic collection query...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in current database:', collections.map(c => c.name));
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.reason) {
      console.error('Error reason:', error.reason);
    }
    
    return false;
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testConnection().then(success => {
  console.log('\n=== Connection Test Complete ===');
  console.log('Result:', success ? 'SUCCESS' : 'FAILED');
  process.exit(success ? 0 : 1);
});
