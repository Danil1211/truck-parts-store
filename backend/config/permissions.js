module.exports = {
  'products:read':   ['owner','admin','manager','viewer'],
  'products:write':  ['owner','admin','manager'],

  'orders:read':     ['owner','admin','manager'],
  'orders:write':    ['owner','admin'],

  'clients:read':    ['owner','admin','manager'],
  'clients:write':   ['owner','admin'],

  'settings:write':  ['owner','admin'],
  'billing:write':   ['owner'], // смена плана/оплата из админки
};
