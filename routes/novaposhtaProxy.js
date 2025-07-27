const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const NOVAPOSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const NOVAPOSHTA_API_KEY = 'c3686f791cb747ffeb935614ac10011e'; // замени на свой ключ

// === Поиск города по подстроке с фильтрацией только городов ===
router.post('/findCities', async (req, res) => {
  const { query } = req.body;
  if (!query || query.length < 2) return res.json({ data: [] });

  try {
    const response = await fetch(NOVAPOSHTA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: NOVAPOSHTA_API_KEY,
        modelName: 'Address',
        calledMethod: 'searchSettlements',
        methodProperties: {
          CityName: query,
          Limit: 20
        }
      })
    });
    const data = await response.json();

    let addresses = [];
    if (Array.isArray(data.data)) {
      data.data.forEach(group => {
        if (Array.isArray(group.Addresses)) {
          // Оставляем только объекты с SettlementTypeDescription === "город"
          const filtered = group.Addresses.filter(addr => addr.SettlementTypeDescription === "город");
          addresses = addresses.concat(filtered);
        }
      });
    }
    res.json({ data: addresses });
  } catch (error) {
    console.error('Ошибка поиска городов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === Получение отделений по городу (cityRef) ===
router.post('/getWarehouses', async (req, res) => {
  const { cityRef } = req.body;
  if (!cityRef) return res.status(400).json({ error: 'cityRef обязателен' });

  try {
    const response = await fetch(NOVAPOSHTA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: NOVAPOSHTA_API_KEY,
        modelName: 'Address',
        calledMethod: 'getWarehouses',
        methodProperties: { CityRef: cityRef }
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Ошибка при получении отделений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
