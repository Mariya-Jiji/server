const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Make sure config works

const User = require('../models/User');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/homeease');

  const providers = await User.find({ role: 'provider', location: { $exists: true, $ne: '' } });
  
  console.log(`Found ${providers.length} providers with string locations to migrate.`);

  let migratedCount = 0;
  for (const provider of providers) {
    if (provider.location && provider.location.includes(',')) {
      const parts = provider.location.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());

        if (!isNaN(lat) && !isNaN(lng)) {
          // Temporarily set a bypass flag if needed, but we remove the field via update
          await User.updateOne(
            { _id: provider._id },
            { 
              $set: { latitude: lat, longitude: lng },
              $unset: { location: "" } 
            }
          );
          migratedCount++;
        }
      }
    }
  }

  console.log(`Successfully migrated ${migratedCount} provider locations to numeric coordinates.`);
  process.exit(0);
}

migrate().catch(console.error);
