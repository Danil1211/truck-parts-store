// backend/models/models.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const tenantScope = require('../plugins/tenantScope');
const SECRET = process.env.JWT_SECRET || 'truck_secret';

/* =============== helpers =============== */
function touchUpdatedAt(schema) {
  schema.pre('save', function (next) { this.updatedAt = new Date(); next(); });
  schema.pre('findOneAndUpdate', function (next) { this.set({ updatedAt: new Date() }); next(); });
}

/* =============== Tenant =============== */
const TenantSchema = new Schema({
  name: { type: String, required: true },
  subdomain: { type: String, unique: true, sparse: true },
  customDomain: { type: String, unique: true, sparse: true },
  plan: { type: String, enum: ['free','basic','pro'], default: 'free' },
  trialUntil: { type: Date },
  isBlocked: { type: Boolean, default: false },
  contacts: {
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
}, { timestamps: true });
touchUpdatedAt(TenantSchema);

/* =============== User =============== */
const UserSchema = new Schema({
  tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  email:        { type: String, required: true },
  passwordHash: { type: String, required: true },
  name:         { type: String, required: true },
  surname:      { type: String, default: '' },
  phone:        { type: String, default: '' },

  isAdmin:      { type: Boolean, default: false },
  role:         { type: String, enum: ['owner','admin','manager','viewer','customer'], default: 'customer' },

  status:          { type: String, enum: ['new','waiting','done','missed'], default: 'waiting' },
  lastMessageAt:   { type: Date, default: Date.now },
  adminLastReadAt: { type: Date, default: null },

  // presence
  lastOnlineAt: { type: Date, default: Date.now },
  ip:           { type: String, default: '' },
  city:         { type: String, default: '' },
  isOnline:     { type: Boolean, default: false },
  isBlocked:    { type: Boolean, default: false },

  // последние данные страницы клиента
  lastPageUrl:   { type: String, default: '' }, // относительный путь (/catalog?x=1)
  lastPageHref:  { type: String, default: '' }, // абсолютный адрес (https://site.com/catalog?x=1)
  lastReferrer:  { type: String, default: '' },
  lastPageTitle: { type: String, default: '' },
}, { timestamps: true });
touchUpdatedAt(UserSchema);
if (tenantScope) UserSchema.plugin(tenantScope);

/* =============== Category =============== */
const CategorySchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name:     { type: String, required: true },
  slug:     { type: String, required: true },
}, { timestamps: true });
touchUpdatedAt(CategorySchema);
if (tenantScope) CategorySchema.plugin(tenantScope);

/* =============== Group =============== */
const GroupSchema = new Schema({
  tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name:       { type: String, required: true },
  description:{ type: String, default: '' },
  img:        { type: String, default: null },
  parentId:   { type: Schema.Types.ObjectId, ref: 'Group', default: null },
  order:      { type: Number, default: 0 },
}, { timestamps: true });
touchUpdatedAt(GroupSchema);
if (tenantScope) GroupSchema.plugin(tenantScope);

/* =============== Product =============== */
const ProductSchema = new Schema({
  tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name:        { type: String, required: true },
  sku:         { type: String },
  description: { type: String },

  group:       { type: Schema.Types.ObjectId, ref: 'Group', required: true },

  // Медиа
  images:      [String],
  videoUrl:    { type: String, default: "" },

  // Цены
  priceMode:   { type: String, enum: ["retail","wholesale","both","service"], default: "retail" },
  retailPrice: { type: Number, default: 0 },
  retailCurrency: { type: String, default: "UAH" },
  priceFromFlag: { type: Boolean, default: false },

  wholesaleTiers: [{
    price: { type: Number, default: 0 },
    currency: { type: String, default: "UAH" },
    minQty: { type: Number, default: 0 }
  }],

  unit:        { type: String, default: "шт" },
  stockState:  { type: String, enum: ["in_stock","preorder","out"], default: "in_stock" },
  stock:       { type: Number, default: 0 },
  regions:     [String],

  // Видимость
  availability:{ type: String, enum: ['published','hidden','draft'], default: 'published' },

  // Характеристики
  attrs: [ { key: String, value: String } ],

  // Поисковые запросы
  queries:     [String],
  googleCategory: { type: String, default: "" },

  // Габариты
  width:       { type: Number, default: 0 },
  height:      { type: Number, default: 0 },
  length:      { type: Number, default: 0 },
  weight:      { type: Number, default: 0 },

  // SEO
  seoTitle:   { type: String, default: "" },
  seoDesc:    { type: String, default: "" },
  seoKeys:    { type: String, default: "" },
  seoSlug:    { type: String, default: "" },
  seoNoindex: { type: Boolean, default: false },

  deleted:     { type: Boolean, default: false },
}, { timestamps: true });
touchUpdatedAt(ProductSchema);
if (tenantScope) ProductSchema.plugin(tenantScope);

/* =============== Order =============== */
const OrderSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  user:     { type: Schema.Types.ObjectId, ref: 'User' },
  items:    [{ product: { type: Schema.Types.ObjectId, ref: 'Product' }, quantity: Number, price: Number }],
  address:  { type: String },
  novaPoshta: { type: String },
  paymentMethod: { type: String },
  status:   { type: String, enum: ['new','processing','shipped','done','cancelled'], default: 'new' },
  totalPrice: { type: Number },
  contactName: { type: String },
  contactSurname: { type: String },
  contactPhone: { type: String },
  contactEmail: { type: String },
  comment:  { type: String },
  deliveryType: { type: String },
  cancelReason: { type: String, default: '' },
}, { timestamps: true });
touchUpdatedAt(OrderSchema);
if (tenantScope) OrderSchema.plugin(tenantScope);

/* =============== Message =============== */
const MessageSchema = new Schema({
  tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  user:      { type: Schema.Types.ObjectId, ref: 'User' },
  text:      { type: String },
  fromAdmin: { type: Boolean, default: false },
  read:      { type: Boolean, default: false },
  imageUrls: [String],
  audioUrl:  { type: String },
}, { timestamps: true });
touchUpdatedAt(MessageSchema);
if (tenantScope) MessageSchema.plugin(tenantScope);

/* =============== SiteSettings =============== */
const SiteSettingsSchema = new Schema({
  tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true, unique: true },
  siteName:   { type: String, default: "MySite" },
  siteLogo:   { type: String, default: null },
  favicon:    { type: String, default: null },
  contacts: {
    phone: String,
    phoneComment: String,
    email: String,
    contactPerson: String,
    address: String,
    phones: [String],
    chatSettings: {
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
      workDays: [String],
      iconPosition: { type: String, default: 'left' },
      color: { type: String, default: '#2291ff' },
      greeting: { type: String, default: '' },
    },
  },
  display: {
    categories: { type: Boolean, default: true },
    showcase: { type: Boolean, default: true },
    promos: { type: Boolean, default: true },
    blog: { type: Boolean, default: false },
    chat: { type: Boolean, default: true },
    template: { type: String, default: 'standard' },
    palette: { type: Object, default: { primary: '#2291ff' } },
  },
  verticalMenu: [{ title: String, url: String, visible: Boolean, order: Number }],
  horizontalMenu: [{ title: String, url: String, visible: Boolean, order: Number }],
  showcase: {
    enabled: { type: Boolean, default: false },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  },
}, { timestamps: true });
touchUpdatedAt(SiteSettingsSchema);
if (tenantScope) SiteSettingsSchema.plugin(tenantScope);

/* =============== Blog (минимум для публички) =============== */
const BlogSchema = new Schema({
  tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  title:     { type: String, required: true },
  slug:      { type: String, required: true, index: true },
  content:   { type: String, default: '' },
  published: { type: Boolean, default: false },
}, { timestamps: true });
touchUpdatedAt(BlogSchema);
if (tenantScope) BlogSchema.plugin(tenantScope);

/* =============== JWT =============== */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      tenantId: user.tenantId.toString(),
      email: user.email,
      name: user.name,
      surname: user.surname || '',
      phone: user.phone,
      isAdmin: user.isAdmin,
      role: user.role,
    },
    SECRET,
    { expiresIn: '365d' }
  );
}

/* =============== exports =============== */
module.exports = {
  Tenant: mongoose.model('Tenant', TenantSchema),
  User: mongoose.model('User', UserSchema),
  Category: mongoose.model('Category', CategorySchema),
  Group: mongoose.model('Group', GroupSchema),
  Product: mongoose.model('Product', ProductSchema),
  Order: mongoose.model('Order', OrderSchema),
  Message: mongoose.model('Message', MessageSchema),
  SiteSettings: mongoose.model('SiteSettings', SiteSettingsSchema),
  Blog: mongoose.model('Blog', BlogSchema),
  generateToken
};
