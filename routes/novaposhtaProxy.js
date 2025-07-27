const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const NOVAPOSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const NOVAPOSHTA_API_KEY = 'c3686f791cb747ffeb935614ac10011e'; // твой ключ

// === Поиск города по подстроке ===
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
    console.error('Ошибка поиска городов:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === Получение Ref города для getWarehouses ===
router.post('/findCityRef', async (req, res) => {
  const { cityName, deliveryCity } = req.body;
  try {
    const response = await fetch(NOVAPOSHTA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: NOVAPOSHTA_API_KEY,
        modelName: 'Address',
        calledMethod: 'getCities',
        methodProperties: {
          FindByString: cityName,
        },
      }),
    });
    const data = await response.json();
    const match = (data.data || []).find(
      city =>
        (deliveryCity && city.DeliveryCity === deliveryCity) ||
        (city.Description && city.Description.toLowerCase() === cityName.toLowerCase())
    );
    if (match) return res.json({ ref: match.Ref, description: match.Description });
    return res.status(404).json({ error: 'City not found in directory' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === Получение отделений по Ref города ===
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
      }),
    });

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Ошибка при получении отделений:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
