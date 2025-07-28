const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const NOVAPOSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const NOVAPOSHTA_API_KEY = 'c3686f791cb747ffeb935614ac10011e'; // твой ключ

// === Поиск города по подстроке ===
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
        methodProperties: {
          CityName: query,
          Limit: 20,
        },
      }),
    });
    const data = await response.json();

    // Формируем массив городов как нужно фронту
    let cityList = [];
    if (Array.isArray(data.data) && data.data[0]?.Addresses) {
      cityList = data.data[0].Addresses.map(addr => ({
        Present: addr.Present,                   // Читаемое имя (с областью, районом и тд)
        Description: addr.MainDescription,       // Название города
        DeliveryCity: addr.DeliveryCity,         // CityRef
        AreaDescription: addr.AreaDescription,   // Область
        Ref: addr.DeliveryCity,                  // тот же CityRef
      }));
    }

    res.json({ data: cityList });
  } catch (error) {
    console.error('[findCities] Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === Получить отделения по DeliveryCity ===
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
        methodProperties: { CityRef: cityRef },
      }),
    });

    const data = await response.json();
    res.json({ data: data.data || [] });
  } catch (error) {
    console.error('[getWarehouses] Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
