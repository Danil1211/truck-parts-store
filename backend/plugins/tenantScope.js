const mongoose = require('mongoose');

module.exports = function tenantScope(schema) {
  schema.add({ tenantId: { type: mongoose.Schema.Types.ObjectId, index: true, required: true } });

  schema.pre('save', function(next) {
    if (!this.tenantId && this.$locals?.$tenantId) this.tenantId = this.$locals.$tenantId;
    next();
  });

  const hooks = [
    'find','findOne','count','countDocuments',
    'findOneAndUpdate','updateMany','updateOne',
    'deleteMany','deleteOne'
  ];
  hooks.forEach(h => {
    schema.pre(h, function() {
      if (this.options && this.options.$tenantId && !this.getQuery().tenantId) {
        this.where({ tenantId: this.options.$tenantId });
      }
    });
  });
};
