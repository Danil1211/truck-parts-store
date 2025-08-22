const { Product, Message } = require('../models/models');

exports.getTenantUsage = async (tenantId) => {
  const [products, chats] = await Promise.all([
    Product.countDocuments({}, { $tenantId: tenantId }),
    Message.countDocuments({}, { $tenantId: tenantId }),
  ]);
  // storageMb можно посчитать по файловой системе позже
  return { products, chats, storageMb: 0 };
};
