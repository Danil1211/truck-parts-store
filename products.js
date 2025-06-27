const express = require('express');
const router = express.Router();
const { Product } = require('./models');

// 🧪 Seed — временное добавление тестовых товаров
router.post('/seed', async (req, res) => {
  try {
    await Product.deleteMany();

    const testProducts = await Product.insertMany([
      {
        name: 'Фара Volvo FH12',
        price: 1800,
        image: '/images/005-0110.png',
        description: 'Левая фара Volvo FH12',
        stock: 10
      },
      {
        name: 'Амортизатор MAN TGA',
        price: 950,
        image: '/images/005-0110.png',
        description: 'Амортизатор подвески для MAN',
        stock: 20
      }
    ]);

    res.json(testProducts);
  } catch (err) {
    console.error('Ошибка seed-запроса:', err);
    res.status(500).json({ error: 'Ошибка при seed-запросе' });
  }
});

// 🔍 Получить все товары
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при загрузке товаров' });
  }
});

// 🔍 Получить один товар по ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: 'Неверный ID' });
  }
});

module.exports = router;
