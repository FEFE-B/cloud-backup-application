// MongoDB Connection Test for Railway
const mongoose = require('mongoose');

async function testMongoConnection() {
  console.log('🔍 Testing MongoDB Connection...');
  console.log('Environment:', process.env.NODE_ENV);
  
  // Get MongoDB URI from environment variables
  const mongoURI = process.env.MONGO_URI || process.env.DATABASE_URL || process.env.MONGODB_URI;
  
  if (!mongoURI) {
    console.log('❌ No MongoDB URI found in environment variables');
    console.log('Expected environment variables: MONGO_URI, DATABASE_URL, or MONGODB_URI');
    return false;
  }
  
  if (mongoURI.includes('[USERNAME]') || mongoURI.includes('[PASSWORD]')) {
    console.log('❌ MongoDB URI contains placeholder values');
    console.log('Please configure proper MongoDB credentials');
    return false;
  }
  
  console.log('🔗 Attempting connection to:', mongoURI.replace(/:[^:@]*@/, ':***@'));
  
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    
    console.log('✅ MongoDB Connection Successful!');
    
    // Test basic operations
    const testCollection = mongoose.connection.db.collection('test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    await testCollection.deleteOne({ test: true });
    
    console.log('✅ Database operations test passed');
    
    await mongoose.disconnect();
    console.log('✅ MongoDB connection closed cleanly');
    
    return true;
    
  } catch (error) {
    console.log('❌ MongoDB Connection Failed:');
    console.log('Error:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('💡 Possible causes:');
      console.log('   - Database server is down');
      console.log('   - Network connectivity issues');
      console.log('   - Incorrect connection string');
      console.log('   - IP address not whitelisted');
    }
    
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMongoConnection()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testMongoConnection };
