// models.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const dotenv = require('dotenv');
dotenv.config();

const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'truck_secret';

/* ------------------------------------------------------------------ */
/*                     Общие утилиты/хуки схем                         */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*                             Tenant (SaaS)                           */
/* ------------------------------------------------------------------ */
const TenantSchema = new Schema({
  name:         { type: String, required: true },
  subdomain:    { type: String, unique: true, sparse: true },   // demo → demo.shopik.com
  customDomain: { type: String, unique: true, sparse: true },   // myshop.com
  plan:         { type: String, enum: ['free','basic','pro'], default: 'free' },
  currentPeriodEnd: { type: Date },
  isBlocked:    { type: Boolean, default: false },
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
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});
touchUpdatedAt(TenantSchema); // индексы unique уже заданы полями, дублировать через .index() не нужно

/* ------------------------------------------------------------------ */
/*                             User                                    */
/*   ВАЖНО: email/phone уникальны В РАМКАХ TENANT, а не глобально.     */
/* ------------------------------------------------------------------ */
const UserSchema = new Schema({
  tenantId:    { type: String, required: true, index: true },

  email:       { type: String, required: true },
  passwordHash:{ type: String, required: true },
  name:        { type: String, required: true },
  surname:     { type: String, default: '' },
  phone:       { type: String, required: true },

  isAdmin:     { type: Boolean, default: false },
  status:      { type: String, enum: ['new', 'waiting', 'done', 'missed'], default: 'waiting' },

  lastMessageAt:   { type: Date, default: Date.now },
  adminLastReadAt: { type: Date, default: null },
  createdAt:       { type: Date, default: Date.now },
  lastOnlineAt:    { type: Date, default: Date.now },

  ip:          { type: String, default: '' },
  city:        { type: String, default: '' },
  isOnline:    { type: Boolean, default: false },
  isBlocked:   { type: Boolean, default: false },

  updatedAt:   { type: Date, default: Date.now }
});
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
touchUpdatedAt(UserSchema);

/* ------------------------------------------------------------------ */
/*                             Category                                */
/* ------------------------------------------------------------------ */
const CategorySchema = new Schema({
  tenantId: { type: String, required: true, index: true },

  name: { type: String, required: true },
  slug: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
CategorySchema.index({ tenantId: 1, slug: 1 }, { unique: true });
touchUpdatedAt(CategorySchema);

/* ------------------------------------------------------------------ */
/*                             Product                                 */
/* ------------------------------------------------------------------ */
const ProductSchema = new Schema({
  tenantId:    { type: String, required: true, index: true },

  name:        { type: String, required: true },
  sku:         { type: String },
  description: { type: String },

  // у тебя группа хранится строкой
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
ProductSchema.index({ tenantId: 1, name: 1 });
ProductSchema.index({ tenantId: 1, group: 1 });
ProductSchema.index({ tenantId: 1, availability: 1 });
// Если нужен уникальный SKU в рамках арендатора, раскомментируй:
// ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
touchUpdatedAt(ProductSchema);

/* ------------------------------------------------------------------ */
/*                              Order                                  */
/* ------------------------------------------------------------------ */
const OrderSchema = new Schema({
  tenantId: { type: String, required: true, index: true },

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

  // Контактные данные:
  contactName:    { type: String },
  contactSurname: { type: String },
  contactPhone:   { type: String },
  contactEmail:   { type: String },
  comment:        { type: String },
  deliveryType:   { type: String },

  // Причина отмены
  cancelReason:   { type: String, default: '' },
});
OrderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
touchUpdatedAt(OrderSchema);

/* ------------------------------------------------------------------ */
/*                             Message                                 */
/* ------------------------------------------------------------------ */
const MessageSchema = new Schema({
  tenantId:  { type: String, required: true, index: true },

  user:      { type: Schema.Types.ObjectId, ref: 'User' },
  text:      { type: String },
  fromAdmin: { type: Boolean, default: false },
  read:      { type: Boolean, default: false },

  imageUrls: [String],
  audioUrl:  { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
MessageSchema.index({ tenantId: 1, user: 1, createdAt: -1 });
touchUpdatedAt(MessageSchema);

/* ------------------------------------------------------------------ */
/*                          SiteSettings                               */
/*      Один документ на tenant: уникальный индекс по tenantId         */
/* ------------------------------------------------------------------ */
const SiteSettingsSchema = new Schema({
  tenantId:   { type: String, required: true, index: true, unique: true },

  siteName:   { type: String, default: "SteelTruck" },

  contacts: {
    phone:         { type: String, default: "" },
    phoneComment:  { type: String, default: "" },
    email:         { type: String, default: "" },
    contactPerson: { type: String, default: "" },
    address:       { type: String, default: "" },
    phones:        { type: [ { phone: String, comment: String } ], default: [] },
    chatSettings: {
      startTime:    { type: String, default: "09:00" },
      endTime:      { type: String, default: "18:00" },
      workDays:     { type: [String], default: ["mon", "tue", "wed", "thu", "fri"] },
      iconPosition: { type: String, default: "left" },
      color:        { type: String, default: "#2291ff" },
      greeting:     { type: String, default: "" }
    }
  },

  display: {
    categories: { type: Boolean, default: true },
    showcase:   { type: Boolean, default: true },
    promos:     { type: Boolean, default: true },
    blog:       { type: Boolean, default: true },
    chat:       { type: Boolean, default: true },
    palette: {
      primary:         { type: String, default: "#2291ff" },
      "primary-dark":  { type: String, default: "#1275be" },
      accent:          { type: String, default: "#3fd9d6" },
      title:           { type: String, default: "#18446e" },
      "title-alt":     { type: String, default: "#2175f3" },
      secondary:       { type: String, default: "#f6fafd" },
      bg:              { type: String, default: "#f7fafd" },
      "bg-card":       { type: String, default: "#fff" },
      "side-menu-border": { type: String, default: "#2291ff" },
      "block-bg":      { type: String, default: "#f6fafd" },
      "footer-bg":         { type: String, default: "#232a34" },
      "footer-title":      { type: String, default: "#fff" },
      "footer-text":       { type: String, default: "#ccd7e5" },
      "footer-link":       { type: String, default: "#ccd7e5" },
      "footer-link-hover": { type: String, default: "#fff" },
      "footer-dayoff":     { type: String, default: "#fa5b5b" },
      "footer-bottom-bg":  { type: String, default: "#232a34" },
      "footer-bottom":     { type: String, default: "#aeb6c3" },
      "footer-border":     { type: String, default: "#303944" },
    },
    template: { type: String, default: "standard" }
  },

  siteLogo:   { type: String, default: null },
  favicon:    { type: String, default: null },

  // Меню
  verticalMenu: [{
    title:   { type: String, default: "" },
    url:     { type: String, default: "/" },
    visible: { type: Boolean, default: true },
    order:   { type: Number, default: 0 },
  }],
  horizontalMenu: [{
    title:   { type: String, default: "" },
    url:     { type: String, default: "/" },
    visible: { type: Boolean, default: true },
    order:   { type: Number, default: 0 },
  }],

  // Витрина
  showcase: {
    enabled:    { type: Boolean, default: true },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
  },

  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now }
});
touchUpdatedAt(SiteSettingsSchema);

/* ------------------------------------------------------------------ */
/*                              Group                                  */
/* ------------------------------------------------------------------ */
const groupSchema = new Schema({
  tenantId:    { type: String, required: true, index: true },

  name:        { type: String, required: true },
  img:         { type: String, default: null },
  description: { type: String, default: '' },

  count:       { type: Number, default: 0 },
  published:   { type: Number, default: 0 },
  hidden:      { type: Number, default: 0 },
  deleted:     { type: Number, default: 0 },

  children: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
  parentId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
  order:    { type: Number, default: 0 },

  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now }
});
// уникальность имени в рамках одного родителя и арендатора
groupSchema.index({ tenantId: 1, parentId: 1, name: 1 }, { unique: true });
touchUpdatedAt(groupSchema);
const Group = mongoose.model('Group', groupSchema);

/* ------------------------------------------------------------------ */
/*                               Blog                                  */
/* ------------------------------------------------------------------ */
const BlogSchema = new Schema({
  tenantId:   { type: String, required: true, index: true },

  title:      { type: String, required: true },
  slug:       { type: String, required: true }, // уникален в рамках tenant
  excerpt:    { type: String, default: '' },
  content:    { type: String, default: '' },
  coverImage: { type: String, default: null },
  tags:       { type: [String], default: [] },
  published:  { type: Boolean, default: false },

  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now }
});
BlogSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
touchUpdatedAt(BlogSchema);

/* ------------------------------------------------------------------ */
/*                       JWT с tenantId внутри                        */
/* ------------------------------------------------------------------ */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      surname: user.surname || '',
      phone: user.phone,
      isAdmin: user.isAdmin
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
  Group,
  SiteSettings: mongoose.model('SiteSettings', SiteSettingsSchema),
  Blog: mongoose.model('Blog', BlogSchema),
  generateToken
};
