const express = require('express');
const router = express.Router();
const { Order, Product } = require('../models');
const { authMiddleware, adminMiddleware } = require('../protected');

// 🔐 Создание нового заказа
router.post('/', authMiddleware, async (req, res) => {
  const {
    items, address, novaPoshta, paymentMethod,
    name, surname, phone, email, comment, deliveryType
  } = req.body;
  const user = req.user;

  try {
    const populatedItems = [];
    let total = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(400).json({ error: 'Товар не найден: ' + item.product });
      }

      total += product.price * item.quantity;

      populatedItems.push({
        product: product._id,
        quantity: item.quantity,
      });
    }

    const newOrder = new Order({
      user: user.id,
      items: populatedItems,
      address,
      novaPoshta,
      paymentMethod,
      totalPrice: total,
      status: 'new',

      // --- Контактные и доп. данные ---
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

// 👤 Получить заказы текущего пользователя
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

// 👑 Получить все заказы (только для администратора) c пагинацией, поиском и фильтрами
router.get('/admin', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      sort = 'desc'
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Сборка фильтра
    let query = {};
    if (status && status !== 'all') query.status = status;

    // Поиск по номеру заказа, email, имени, телефону
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { _id: regex },
        { 'user.email': regex },
        { 'user.name': regex },
        { 'user.phone': regex },
        // Для поиска по контактам заказа:
        { contactName: regex },
        { contactSurname: regex },
        { contactPhone: regex },
        { contactEmail: regex },
      ];
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product')
      .sort({ createdAt: sort === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ orders, total });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

// 👑 Получить заказы конкретного пользователя (по userId) с пагинацией
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { user, page = 1, limit = 5 } = req.query;
    const filter = user ? { user } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.product')
        .populate('user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter),
    ]);
    res.json({
      orders,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (err) {
    console.error('Ошибка загрузки заказов по клиенту:', err);
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
});

// 🔄 Обновление статуса заказа (только админ)
router.put('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  const { status } = req.body;

  if (!['new', 'processing', 'done', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });

    order.status = status;
    await order.save();

    res.json({ message: 'Статус обновлён', order });
  } catch (err) {
    console.error('Ошибка обновления заказа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 🚩 ОТМЕНА ЗАКАЗА АДМИНОМ (можно отменить любой заказ, добавить причину)
router.put('/:id/cancel', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
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

// 🚩 ОТМЕНА ЗАКАЗА ПОЛЬЗОВАТЕЛЕМ (только если статус "new" и только свой)
router.put('/:id/cancel-my', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });

    if (order.user.toString() !== req.user.id.toString()) {
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
