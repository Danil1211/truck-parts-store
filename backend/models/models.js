// backend/models/models.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const dotenv = require('dotenv');
dotenv.config();

const jwt = require('jsonwebtoken');
const tenantScope = require('../plugins/tenantScope');
const SECRET = process.env.JWT_SECRET || 'truck_secret';

/* ====================== Утилиты ====================== */
function touchUpdatedAt(schema) {
  schema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
  });
  schema.pre('findOneAndUpdate', function (next) {
    this.set({ updatedAt: new Date() });
    next();
  });
}

/* ====================== Tenant ====================== */
const TenantSchema = new Schema({
  name:            { type: String, required: true },
  subdomain:       { type: String, unique: true, sparse: true },
  customDomain:    { type: String, unique: true, sparse: true },
  plan:            { type: String, enum: ['free','basic','pro'], default: 'free' },
  currentPeriodEnd:{ type: Date },
  isBlocked:       { type: Boolean, default: false },
  settings: {
    brand: {
      logoUrl: { type: String, default: null },
      color:   { type: String, default: '#2291ff' },
    },
    contacts: {
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
touchUpdatedAt(TenantSchema);
TenantSchema.index({ subdomain: 1 }, { unique: true, sparse: true });
TenantSchema.index({ customDomain: 1 }, { unique: true, sparse: true });

/* ====================== User ====================== */
const UserSchema = new Schema({
  tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

  email:        { type: String, required: true },
  passwordHash: { type: String, required: true },
  name:         { type: String, required: true },
  surname:      { type: String, default: '' },
  phone:        { type: String, default: '' },

  isAdmin:      { type: Boolean, default: false },
  role:         { type: String, enum: ['owner','admin','manager','viewer','customer'], default: 'customer' },

  status:       { type: String, enum: ['new', 'waiting', 'done', 'missed'], default: 'waiting' },

  lastMessageAt:   { type: Date, default: Date.now },
  adminLastReadAt: { type: Date, default: null },
  createdAt:       { type: Date, default: Date.now },
  lastOnlineAt:    { type: Date, default: Date.now },

  ip:           { type: String, default: '' },
  city:         { type: String, default: '' },
  isOnline:     { type: Boolean, default: false },
  isBlocked:    { type: Boolean, default: false },

  updatedAt:    { type: Date, default: Date.now }
});
touchUpdatedAt(UserSchema);
UserSchema.plugin(tenantScope);

/* ====================== Category ====================== */
const CategorySchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
touchUpdatedAt(CategorySchema);
CategorySchema.plugin(tenantScope);

/* ====================== Product ====================== */
const ProductSchema = new Schema({
  tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

  name:        { type: String, required: true },
  sku:         { type: String },
  description: { type: String },

  group:       { type: String, required: true },

  hasProps:    { type: Boolean, default: false },
  propsColor:  { type: String, default: '' },
  queries:     { type: String, default: '' },

  width:       { type: String, default: '' },
  height:      { type: String, default: '' },
  length:      { type: String, default: '' },
  weight:      { type: String, default: '' },

  price:       { type: Number, required: true },
  unit:        { type: String, default: 'шт' },

  availability:{
    type: String,
    enum: ['В наличии', 'Под заказ', 'Нет в наличии'],
    default: 'В наличии'
  },

  stock:       { type: String, default: '' },
  images:      [String],

  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});
touchUpdatedAt(ProductSchema);
ProductSchema.plugin(tenantScope);

/* ====================== Order ====================== */
const OrderSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

  user:  { type: Schema.Types.ObjectId, ref: 'User' },
  items: [
    {
      product:  { type: Schema.Types.ObjectId, ref: 'Product' },
      quantity: Number
    }
  ],

  address:        { type: String, required: true },
  novaPoshta:     { type: String, required: true },
  paymentMethod:  { type: String, required: true },
  status:         { type: String, enum: ['new', 'processing', 'shipped', 'done', 'cancelled'], default: 'new' },
  totalPrice:     { type: Number },

  createdAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now },

  contactName:    { type: String },
  contactSurname: { type: String },
  contactPhone:   { type: String },
  contactEmail:   { type: String },
  comment:        { type: String },
  deliveryType:   { type: String },
  cancelReason:   { type: String, default: '' },
});
touchUpdatedAt(OrderSchema);
OrderSchema.plugin(tenantScope);

/* ====================== Message (чат) ====================== */
const MessageSchema = new Schema({
  tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

  user:      { type: Schema.Types.ObjectId, ref: 'User' },
  text:      { type: String },
  fromAdmin: { type: Boolean, default: false },
  read:      { type: Boolean, default: false },

  imageUrls: [String],
  audioUrl:  { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
touchUpdatedAt(MessageSchema);
MessageSchema.plugin(tenantScope);

/* ====================== SiteSettings ====================== */
const SiteSettingsSchema = new Schema({
  tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true, unique: true },
  siteName:   { type: String, default: "SteelTruck" },
  contacts: { phone: String, email: String },
  display: { categories: { type: Boolean, default: true } },
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now }
});
touchUpdatedAt(SiteSettingsSchema);
SiteSettingsSchema.plugin(tenantScope);

/* ====================== Group ====================== */
const GroupSchema = new Schema({
  tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name:        { type: String, required: true },
  img:         { type: String, default: null },
  description: { type: String, default: '' },
  parentId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
  order:    { type: Number, default: 0 },
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now }
});
touchUpdatedAt(GroupSchema);
GroupSchema.plugin(tenantScope);

/* ====================== Blog ====================== */
const BlogSchema = new Schema({
  tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  title:      { type: String, required: true },
  slug:       { type: String, required: true },
  published:  { type: Boolean, default: false },
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now }
});
touchUpdatedAt(BlogSchema);
BlogSchema.plugin(tenantScope);

/* ====================== JWT ====================== */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      surname: user.surname || '',
      phone: user.phone,
      isAdmin: user.isAdmin,
      role: user.role,
    },
    SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  Tenant: mongoose.model('Tenant', TenantSchema),
  User: mongoose.model('User', UserSchema),
  Category: mongoose.model('Category', CategorySchema),
  Product: mongoose.model('Product', ProductSchema),
  Order: mongoose.model('Order', OrderSchema),
  Message: mongoose.model('Message', MessageSchema),
  Group: mongoose.model('Group', GroupSchema),
  SiteSettings: mongoose.model('SiteSettings', SiteSettingsSchema),
  Blog: mongoose.model('Blog', BlogSchema),
  generateToken
};
