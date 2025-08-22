// backend/plugins/tenantScope.js
const mongoose = require('mongoose');

module.exports = function tenantScope(schema) {
  // Добавляем tenantId во все схемы
  schema.add({
    tenantId: { type: mongoose.Schema.Types.ObjectId, index: true, required: true }
  });

  // При сохранении — проставляем tenantId из $locals
  schema.pre('save', function (next) {
    if (!this.tenantId && this.$locals?.$tenantId) {
      this.tenantId = this.$locals.$tenantId;
    }
    next();
  });

  // Хуки, которые должны автоматически фильтровать по tenantId
  const hooks = [
    'find',
    'findOne',
    'findById',
    'findOneAndUpdate',
    'findByIdAndUpdate',
    'updateMany',
    'updateOne',
    'deleteMany',
    'deleteOne',
    'count',
    'countDocuments'
  ];

  hooks.forEach(hook => {
    schema.pre(hook, function () {
      if (this.options?.$tenantId && !this.getQuery().tenantId) {
        this.where({ tenantId: this.options.$tenantId });
      }
    });
  });
};
