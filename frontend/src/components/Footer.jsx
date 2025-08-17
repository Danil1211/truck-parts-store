import React from 'react';
import '../assets/Footer.css';

function Footer() {
  return (
    <footer className="footer-root">
      <div className="footer-top">
        {/* График работы */}
        <div className="footer-col">
          <div className="footer-title">График работы</div>
          <div className="footer-schedule">
            Пн–Пт: <b>9:00 – 18:00</b><br />
            Сб: <b>10:00 – 15:00</b><br />
            Вс: <span className="footer-dayoff">выходной</span>
          </div>
        </div>
        {/* Контакты */}
        <div className="footer-col">
          <div className="footer-title">Контакты</div>
          <div className="footer-contact">
            <div>
              <img src="/images/phone.webp" alt="" className="footer-icon" />
              <a href="tel:+4799999999">+38 (050) 111-11-11</a>
            </div>
            <div>
              <img src="/images/phone.webp" alt="" className="footer-icon" />
              <a href="tel:+380501111111">+38 (050) 111-11-11</a>
            </div>
            <div>
              {/* Без иконки! */}
              <a href="mailto:info@truckparts.store">info@truckparts.store</a>
            </div>
            <div>
              {/* Без иконки! */}
              <span>ул. Примерная, 12, Москва</span>
            </div>
          </div>
        </div>
        {/* Соц сети */}
        <div className="footer-col">
          <div className="footer-title">Соц сети</div>
          <div className="footer-socials">
            <a href="https://instagram.com/username" target="_blank" rel="noopener">
              <img src="/images/i-icon.png" alt="Instagram" />
            </a>
            <a href="https://t.me/username" target="_blank" rel="noopener">
              <img src="/images/t-icon.png" alt="Telegram" />
            </a>
            <a href="https://facebook.com/username" target="_blank" rel="noopener">
              <img src="/images/f-icon.png" alt="Facebook" />
            </a>
            <a href="viber://chat?number=%2B71234567890" target="_blank" rel="noopener">
              <img src="/images/v-icon.png" alt="Viber" />
            </a>
            <a href="https://wa.me/79999999999" target="_blank" rel="noopener">
              <img src="/images/w-icon.png" alt="WhatsApp" />
            </a>
          </div>
        </div>
      </div>

      {/* Большая картинка Visa-Mastercard */}
      <div className="footer-payments-wide">
        <img src="/images/Visa-Mastercard.webp" alt="Visa и MasterCard" />
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Truck Parts Store — Все права защищены</span>
      </div>
    </footer>
  );
}

export default Footer;
