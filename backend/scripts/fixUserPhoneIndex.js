// backend/scripts/fixUserPhoneIndex.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/truckparts';
const { User } = require('../models');

(async () => {
  try {
    await mongoose.connect(MONGO_URL);
    const col = mongoose.connection.collection('users');

    const idx = await col.indexes();
    const hasOld = idx.find(i => JSON.stringify(i.key) === JSON.stringify({ tenantId: 1, phone: 1 }));

    if (hasOld) {
      console.log('Dropping old {tenantId:1, phone:1} index...');
      await col.dropIndex(hasOld.name);
    } else {
      console.log('Old index not found, skipping drop');
    }

    console.log('Syncing indexes from schema...');
    await User.syncIndexes();

    console.log('Done.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
