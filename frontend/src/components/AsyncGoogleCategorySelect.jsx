// frontend/src/components/AsyncGoogleCategorySelect.jsx
import React, { useState, useEffect } from "react";
import api from "../utils/api";

export default function AsyncGoogleCategorySelect({ value, onChange, lang = "en-US" }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) return;
    let cancelled = false;
    setLoading(true);
    api.get(`/api/taxonomy/google?lang=${lang}&q=${encodeURIComponent(query)}&limit=30`)
      .then(({ data }) => {
        if (!cancelled) setItems(data.items || []);
      })
      .catch(err => console.error("taxonomy search error", err))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, [query, lang]);

  const handleSelect = (id) => {
    onChange(id);
    setQuery(""); setItems([]);
  };

  return (
    <div className="async-select">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Начните вводить категорию..."
      />
      {loading && <div className="dropdown">Загрузка...</div>}
      {!loading && items.length > 0 && (
        <div className="dropdown">
          {items.map(it => (
            <div
              key={it.id}
              className="option"
              onClick={() => handleSelect(it.id)}
            >
              {it.full} <span className="id">({it.id})</span>
            </div>
          ))}
        </div>
      )}
      {value && (
        <div className="selected">
          Выбрано: <b>{value}</b>
          <button type="button" onClick={() => onChange("")}>×</button>
        </div>
      )}
    </div>
  );
}
