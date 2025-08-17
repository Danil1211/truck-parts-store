// routes/orders.js
const express = require('express');
const router = express.Router();

const { Order, Product, User } = require('../models');
const { authMiddleware, adminMiddleware } = require('../protected');
const withTenant = require('../middleware/withTenant');
const mongoose = require('mongoose');

router.use(withTenant);

/**
 * 🔐 Создание нового заказа (только авторизованный пользователь)
 * - Проверяем, что товары принадлежат текущему арендатору
 * - Считаем total по текущим ценам
 * - Сохраняем контактные данные
 */
router.post('/', authMiddleware, async (req, res) => {
  const {
    items,                // [{ product: <id>, quantity: <number> }, ...]
    address,
    novaPoshta,
    paymentMethod,
    name,
    surname,
    phone,
    email,
    comment,
    deliveryType
  } = req.body;

  try {
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Пустой состав заказа' });
    }

    const populatedItems = [];
    let total = 0;

    for (const item of items) {
      if (!item?.product || !item?.quantity) {
        return res.status(400).json({ error: 'Неверный формат items' });
      }

      // Товар — только текущего арендатора
      const product = await Product.findOne({
        _id: item.product,
        tenantId: req.tenantId,
      }).lean();

      if (!product) {
        return res.status(400).json({ error: 'Товар не найден или недоступен', productId: item.product });
      }

      const qty = Number(item.quantity) || 0;
      if (qty <= 0) {
        return res.status(400).json({ error: 'Количество должно быть больше 0' });
      }

      total += (Number(product.price) || 0) * qty;

      populatedItems.push({
        product: product._id,
        quantity: qty,
      });
    }

    const newOrder = new Order({
      tenantId: req.tenantId,
      user: req.user.id,
      items: populatedItems,
      address,
      novaPoshta,
      paymentMethod,
      totalPrice: total,
      status: 'new',

      // Контакты/доп.поля
      contactName: name,
      contactSurname: surname,
      contactPhone: phone,
      contactEmail: email,
      comment,
      deliveryType,
    });

    await newOrder.save();

    res.status(201).json({ message: 'Заказ создан', order: newOrder });
  } catch (err) {
    console.error('💥 Ошибка при создании заказа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * 👤 Мои заказы (текущего пользователя)
 */
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({
      tenantId: req.tenantId,
      user: req.user.id,
    })
      .populate('items.product')
      .sort({ createdAt: -1 })
      .lean();

    res.json(orders);
  } catch (err) {
    console.error('Ошибка загрузки моих заказов:', err);
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

/**
 * 👑 Список всех заказов (админ) с пагинацией/поиском/фильтрами
 * Поиск:
 *  - по ID заказа (точное совпадение, если валидный ObjectId)
 *  - по контактным полям в заказе: contactName, contactSurname, contactPhone, contactEmail
 *  - по пользователям: name, email, phone (через поиск userId и затем фильтр по ним)
 */
router.get('/admin', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      sort = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = { tenantId: req.tenantId };

    if (status && status !== 'all') {
      query.status = status;
    }

    const or = [];

    if (search) {
      const regex = new RegExp(search, 'i');

      // Поиск по контактным полям заказа
      or.push(
        { contactName: regex },
        { contactSurname: regex },
        { contactPhone: regex },
        { contactEmail: regex }
      );

      // Поиск по пользователям (name/email/phone)
      const userOr = [{ name: regex }, { email: regex }, { phone: regex }];
      const foundUsers = await User.find({ $or: userOr }).select('_id').lean();
      if (foundUsers.length) {
        or.push({ user: { $in: foundUsers.map(u => u._id) } });
      }

      // Поиск по ID заказа (точно)
      if (mongoose.Types.ObjectId.isValid(search)) {
        or.push({ _id: new mongoose.Types.ObjectId(search) });
      }
    }

    if (or.length) {
      query.$or = or;
    }

    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product')
      .sort({ createdAt: sort === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      orders,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error('Ошибка загрузки заказов (админ):', err);
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

/**
 * 👑 Заказы конкретного пользователя (админ), с пагинацией
 * ?user=<userId>
 */
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { user, page = 1, limit = 5 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 5));
    const skip = (pageNum - 1) * limitNum;

    const filter = { tenantId: req.tenantId };
    if (user) filter.user = user;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.product')
        .populate('user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      pages: Math.ceil(total / limitNum) || 1,
      total,
      page: pageNum,
    });
  } catch (err) {
    console.error('Ошибка загрузки заказов по клиенту (админ):', err);
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

/**
 * 🔄 Обновление статуса заказа (админ)
 */
router.put('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;

  if (!['new', 'processing', 'done', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }

  try {
    const order = await Order.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!order) return res.status(404).json({ error: 'Заказ не найден' });

    order.status = status;
    await order.save();

    res.json({ message: 'Статус обновлён', order });
  } catch (err) {
    console.error('Ошибка обновления статуса заказа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * 🚩 Отмена заказа админом
 */
router.put('/:id/cancel', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Заказ уже отменён' });
    }

    order.status = 'cancelled';
    if (req.body.reason) order.cancelReason = req.body.reason;
    await order.save();

    res.json({ message: 'Заказ отменён', order });
  } catch (err) {
    console.error('Ошибка отмены заказа (админ):', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * 🚩 Отмена заказа пользователем (только свой и только если "new")
 */
router.put('/:id/cancel-my', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!order) return res.status(404).json({ error: 'Заказ не найден' });

    if (String(order.user) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Нет доступа к заказу' });
    }
    if (order.status !== 'new') {
      return res.status(400).json({ error: 'Заказ уже обрабатывается или завершён' });
    }

    order.status = 'cancelled';
    if (req.body.reason) order.cancelReason = req.body.reason;
    await order.save();

    res.json({ message: 'Заказ отменён', order });
  } catch (err) {
    console.error('Ошибка отмены заказа (пользователь):', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
