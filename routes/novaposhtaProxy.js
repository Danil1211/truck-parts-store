const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const NOVAPOSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const NOVAPOSHTA_API_KEY = 'c3686f791cb747ffeb935614ac10011e'; // твой ключ

// === Поиск городов (autocomplete) ===
router.post('/findCities', async (req, res) => {
  const { query } = req.body || {};
  if (!query || query.length < 2) return res.json({ data: [] });

  try {
    const response = await fetch(NOVAPOSHTA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: NOVAPOSHTA_API_KEY,
        modelName: 'Address',
        calledMethod: 'searchSettlements',
        methodProperties: { CityName: query, Limit: 20 }
      }),
    });

    const data = await response.json();

    let addresses = [];
    if (Array.isArray(data.data)) {
      data.data.forEach(group => {
        if (Array.isArray(group.Addresses)) {
          addresses = addresses.concat(group.Addresses);
        }
      });
    }

    return res.json({ data: addresses });
  } catch (error) {
    console.error('[findCities] Ошибка:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === Получить отделения и почтоматы по DeliveryCity ===
router.post('/getWarehouses', async (req, res) => {
  const { cityRef } = req.body || {};
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
      }),
    });

    const data = await response.json();
    // Тут проверяем, есть ли поле TypeOfWarehouse у отделений!
    if (!Array.isArray(data.data)) {
      return res.json({ data: [] });
    }
    return res.json({ data: data.data });
  } catch (error) {
    console.error('[getWarehouses] Ошибка:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
