const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const NOVAPOSHTA_API_URL = 'https://api.novaposhta.ua/v2.0/json/';
const NOVAPOSHTA_API_KEY = 'c3686f791cb747ffeb935614ac10011e'; // твой ключ

// ==== DEBUG ROUTE ====
router.get('/debug', (req, res) => {
  res.json({ ok: true, ts: Date.now(), message: 'NovaPoshta proxy active!' });
});

// === Поиск городов (autocomplete) ===
router.post('/findCities', async (req, res) => {
  const { query } = req.body || {};
  console.log('[findCities] req.body =', req.body);

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
    return res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// === Получить Ref города для поиска отделений ===
router.post('/findCityRef', async (req, res) => {
  const { deliveryCity, cityName } = req.body || {};
  console.log('[findCityRef] req.body =', req.body);

  if (!deliveryCity || !cityName) {
    return res.status(400).json({ error: 'deliveryCity и cityName обязательны!', body: req.body });
  }

  try {
    const response = await fetch(NOVAPOSHTA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: NOVAPOSHTA_API_KEY,
        modelName: 'Address',
        calledMethod: 'getCities',
        methodProperties: { FindByString: cityName || "" }
      }),
    });
    const data = await response.json();

    const match = (data.data || []).find(city => city.DeliveryCity === deliveryCity);

    if (match) return res.json({ ref: match.Ref, description: match.Description });

    // Для отладки выводим массив DeliveryCity если не найдено
    console.log('[findCityRef] not found, deliveryCity:', deliveryCity, 'all:', (data.data || []).map(x => x.DeliveryCity));

    return res.status(404).json({ error: 'City not found in directory', allCities: (data.data || []).map(x => x.DeliveryCity) });
  } catch (err) {
    console.error('Ошибка поиска Ref города:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// === Получить отделения по Ref города ===
router.post('/getWarehouses', async (req, res) => {
  const { cityRef } = req.body || {};
  console.log('[getWarehouses] req.body =', req.body);

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
    return res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

module.exports = router;
