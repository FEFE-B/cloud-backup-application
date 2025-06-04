const mongoose = require('mongoose');
const User = require('./models/User');

async function testConnection() {
    try {
        await mongoose.connect('mongodb://localhost:27017/altaro_backup', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Successfully connected to MongoDB.');

        // List all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\nAvailable collections:');
        collections.forEach(collection => console.log(`- ${collection.name}`));

        // Count users
        const userCount = await User.countDocuments();
        console.log(`\nTotal users in database: ${userCount}`);

        // List all users
        const users = await User.find({}, 'name email role company');
        console.log('\nUsers in database:');
        users.forEach(user => {
            console.log(`- ${user.name} (${user.email}) - Role: ${user.role}, Company: ${user.company}`);
        });

    } catch (error) {
        console.error('MongoDB connection error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

testConnection();
