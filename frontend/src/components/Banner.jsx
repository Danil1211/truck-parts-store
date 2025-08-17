import React from 'react';
import '../assets/Banner.css';

function Banner() {
  return (
    <div className="banner-root">
      <img
        src="/images/banner.webp"
        alt="Баннер"
        className="banner-img"
        draggable={false}
      />
      {/* Если надо — вот пример текста на баннере (можешь удалить если не нужен) */}
      {/*
      <div className="banner-content">
        <h1>Лучшие автозапчасти для грузовиков</h1>
        <a href="/catalog" className="banner-btn">Перейти в каталог</a>
      </div>
      */}
    </div>
  );
}

export default Banner;
