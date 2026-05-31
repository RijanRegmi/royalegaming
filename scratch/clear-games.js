const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://royalegaming929_db_user:3gENWJJrcqu08s48@cluster0.l2o5z8g.mongodb.net/royalegaming?retryWrites=true&w=majority';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    const db = mongoose.connection.db;

    // Delete all documents in 'games'
    console.log('Deleting all documents from "games" collection...');
    const gamesResult = await db.collection('games').deleteMany({});
    console.log(`Deleted ${gamesResult.deletedCount} games.`);

    // Delete all documents in 'gamecredentials'
    console.log('Deleting all documents from "gamecredentials" collection...');
    const credentialsResult = await db.collection('gamecredentials').deleteMany({});
    console.log(`Deleted ${credentialsResult.deletedCount} game credentials.`);

    console.log('Database clear completed.');
  } catch (err) {
    console.error('Error clearing database:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

run();
