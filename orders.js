const express = require('express');
const router = express.Router();
const { Order, Product } = require('./models');
const { authMiddleware, adminMiddleware } = require('./protected');

// 🔐 Создание нового заказа
router.post('/', authMiddleware, async (req, res) => {
  const { items, address, novaPoshta, paymentMethod } = req.body;
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

// 👑 Получить все заказы (только для администратора)
router.get('/admin', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.json(orders);
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
        .populate('items.product')     // <-- добавлено!
        .populate('user')              // <-- добавлено!
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

  if (!['new', 'processing', 'shipped', 'done'].includes(status)) {
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

module.exports = router;
