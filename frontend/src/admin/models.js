// models.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const dotenv = require('dotenv');
dotenv.config();

const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'truck_secret';

// ✅ Модель пользователя
const UserSchema = new Schema({
  email:       { type: String, required: true, unique: true },
  passwordHash:{ type: String, required: true },
  name:        { type: String, required: true },
  surname:     { type: String, default: '' },
  phone:       { type: String, required: true, unique: true },
  isAdmin:     { type: Boolean, default: false },
  status:      { type: String, enum: ['new', 'waiting', 'done', 'missed'], default: 'waiting' },
  lastMessageAt:   { type: Date, default: Date.now },
  adminLastReadAt: { type: Date, default: null },
  createdAt:       { type: Date, default: Date.now },
  ip:          { type: String, default: '' },
  city:        { type: String, default: '' },
  lastOnlineAt: { type: Date, default: Date.now },
  isOnline:    { type: Boolean, default: false },
  isBlocked:   { type: Boolean, default: false }
});

const CategorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true }
});

const ProductSchema = new Schema({
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
  availability:{ type: String, default: 'published' },
  stock:       { type: String, default: '' },
  images:      [String],
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

const OrderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  items: [
    {
      product: { type: Schema.Types.ObjectId, ref: 'Product' },
      quantity: Number
    }
  ],
  address: { type: String, required: true },
  novaPoshta: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  status: { type: String, enum: ['new', 'processing', 'shipped', 'done', 'cancelled'], default: 'new' },
  totalPrice: Number,
  createdAt: { type: Date, default: Date.now },

  // Контактные данные:
  contactName: { type: String },
  contactSurname: { type: String },
  contactPhone: { type: String },
  contactEmail: { type: String },
  comment: { type: String },
  deliveryType: { type: String },

  // Причина отмены заказа (если отменён)
  cancelReason: { type: String, default: '' },
});

const MessageSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  text: String,
  fromAdmin: Boolean,
  read: { type: Boolean, default: false },
  imageUrls: [String],
  audioUrl: String,
  createdAt: { type: Date, default: Date.now }
});

// --- Сайт настройки (SiteSettings) ---
const SiteSettingsSchema = new Schema({
  siteName:      { type: String, default: "SteelTruck" },
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
      // --- Основные цвета темы
      primary:         { type: String, default: "#2291ff" },
      "primary-dark":  { type: String, default: "#1275be" },
      accent:          { type: String, default: "#3fd9d6" },
      title:           { type: String, default: "#18446e" },
      "title-alt":     { type: String, default: "#2175f3" },
      secondary:       { type: String, default: "#f6fafd" },
      bg:              { type: String, default: "#f7fafd" },
      "bg-card":       { type: String, default: "#fff" },

      // --- ДОБАВЛЕНЫ переменные для границ/блоков ---
      "side-menu-border": { type: String, default: "#2291ff" },
      "block-bg":      { type: String, default: "#f6fafd" },

      // --- Footer ---
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
    template: { type: String, default: "standard" } // можно хранить тут, чтобы display.template читался всегда
  },
  siteLogo:   { type: String, default: null },  // base64 либо путь до файла (если хранишь файл)
  favicon:    { type: String, default: null },  // base64 либо путь до файла (если хранишь файл)

  updatedAt:  { type: Date, default: Date.now }
});

// Группы/подгруппы (с полем order!)
const groupSchema = new Schema({
  name: { type: String, required: true },
  img: { type: String, default: null },
  description: { type: String, default: '' },
  count: { type: Number, default: 0 },
  published: { type: Number, default: 0 },
  hidden: { type: Number, default: 0 },
  deleted: { type: Number, default: 0 },
  children: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
  parentId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
  order: { type: Number, default: 0 }
});

const Group = mongoose.model('Group', groupSchema);

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
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
  User: mongoose.model('User', UserSchema),
  Category: mongoose.model('Category', CategorySchema),
  Product: mongoose.model('Product', ProductSchema),
  Order: mongoose.model('Order', OrderSchema),
  Message: mongoose.model('Message', MessageSchema),
  Group,
  SiteSettings: mongoose.model('SiteSettings', SiteSettingsSchema),
  generateToken
};
