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
  surname:     { type: String, required: true },  // <-- Заменили и сделали обязательным
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

// Остальные схемы оставил без изменений
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
      surname: user.surname,  // <-- изменено здесь
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
  generateToken
};
