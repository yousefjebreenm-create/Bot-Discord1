const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://xhazard000_db_user:NzS5esdMWtGP4h3e@ac-eri1lip-shard-00-00.qsqliuj.mongodb.net:27017,ac-eri1lip-shard-00-01.qsqliuj.mongodb.net:27017,ac-eri1lip-shard-00-02.qsqliuj.mongodb.net:27017/?ssl=true&replicaSet=atlas-nl23vb-shard-0&authSource=admin&appName=Cluster0';

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('\x1b[32m[MongoDB]\x1b[0m Connected successfully.');
  } catch (err) {
    console.error('\x1b[31m[MongoDB]\x1b[0m Connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
