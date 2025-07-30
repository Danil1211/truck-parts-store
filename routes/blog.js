const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json([])); // Возвращаем пустой массив

module.exports = router;
