const mongoose = require('mongoose');
const { Tenant } = require('../models');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGO_URL);

  const tenant = await Tenant.create({
    name: 'Demo Shop',
    subdomain: 'demo',           // будет demo.shopik.com
    plan: 'free',
    settings: { brand: { color: '#2291ff' } }
  });

  console.log('✅ Tenant создан:', tenant);
  process.exit(0);
})();
