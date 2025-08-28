// Загрузка и кэш таксономии Google Product Category (с ID)
// Источник (en-US): https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt
// Можно просить ru-RU / no-NO и т.п.; если 404 — используем en-US.

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const MEMO = {}; // { lang: { updatedAt, items } }

function urlForLang(lang = 'en-US') {
  // Google хранит как taxonomy-with-ids.{lang}.txt
  // Например: en-US, ru-RU, no-NO. Если такого нет — будет 404.
  return `https://www.google.com/basepages/producttype/taxonomy-with-ids.${lang}.txt`;
}

function parseTxt(txt) {
  // Строки вида: "2277 - Vehicles & Parts > Vehicle Parts & Accessories > Motor Vehicle Braking"
  const items = [];
  for (const line of txt.split('\n')) {
    const m = line.match(/^(\d+)\s*-\s*(.+)$/);
    if (!m) continue;
    const id = m[1].trim();
    const full = m[2].trim();
    const parts = full.split(' > ').map(s => s.trim()).filter(Boolean);
    const name = parts[parts.length - 1] || full;
    items.push({ id, path: parts, name, full });
  }
  return items;
}

async function fetchTxt(u) {
  const res = await fetch(u, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${u}`);
  return await res.text();
}

async function loadFromNet(lang) {
  try {
    const txt = await fetchTxt(urlForLang(lang));
    return parseTxt(txt);
  } catch (e) {
    // Фолбэк на en-US
    if (lang !== 'en-US') {
      const txt = await fetchTxt(urlForLang('en-US'));
      return parseTxt(txt);
    }
    throw e;
  }
}

async function loadTaxonomy(lang = 'en-US') {
  if (MEMO[lang]) return MEMO[lang];

  const cacheFile = path.join(CACHE_DIR, `google-taxonomy.${lang}.json`);
  // если кэш свежий (< 7 дней) — читаем
  try {
    const stat = fs.existsSync(cacheFile) ? fs.statSync(cacheFile) : null;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    if (stat && (Date.now() - stat.mtimeMs) < weekMs) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      MEMO[lang] = cached;
      return cached;
    }
  } catch {}

  // качаем и парсим
  const items = await loadFromNet(lang);
  const payload = { lang, updatedAt: new Date().toISOString(), count: items.length, items };
  try { fs.writeFileSync(cacheFile, JSON.stringify(payload)); } catch {}
  MEMO[lang] = payload;
  return payload;
}

module.exports = { loadTaxonomy };
