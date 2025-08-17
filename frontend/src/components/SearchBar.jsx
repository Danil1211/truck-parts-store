import React from 'react';
import './Header.css'; // Или отдельно SearchBar.css

export default function SearchBar({ searchValue, setSearchValue, onSearch }) {
  return (
    <form
      className="search-wrapper"
      onSubmit={e => { e.preventDefault(); if (onSearch) onSearch(); }}
      autoComplete="off"
    >
      <input
        type="text"
        value={searchValue}
        onChange={e => setSearchValue(e.target.value)}
        placeholder="Поиск по каталогу..."
        className="search-input"
      />
      <button type="submit" className="search-icon-btn">
        <img src="/images/lupa.webp" alt="Поиск" className="search-icon-img" />
      </button>
    </form>
  );
}
