import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../assets/Header.css';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import CartPopover from './CartPopover';

export const cartIconRef = React.createRef();

const LANGUAGES = [
  { code: 'ru', label: 'Ru' },
  { code: 'ua', label: 'Ua' },
  { code: 'en', label: 'En' },
];

function Header() {
  const { cartItems } = useCart();
  const { user } = useAuth();
  const { siteName, contacts, siteLogo } = useSite();
  const navigate = useNavigate();
  const location = useLocation();

  const [cartOpen, setCartOpen] = useState(false);
  const popoverRef = useRef(null);
  const iconWrapRef = useRef(null);
  const timerRef = useRef(null);

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Телефон (только первый)
  const phone =
    Array.isArray(contacts?.phones) && contacts.phones[0]?.phone
      ? contacts.phones[0].phone
      : '';

  // Показать номер
  const [phoneVisible, setPhoneVisible] = useState(false);
  useEffect(() => {
    setPhoneVisible(false);
  }, [contacts]);
  const handleShowPhone = () => setPhoneVisible(true);

  // Профиль
  const handleProfileClick = (e) => {
    e.preventDefault();
    if (!user) navigate('/login');
    else navigate('/profile');
  };

  // Popover корзины: закрытие при уходе мыши от иконки и поповера
  useEffect(() => {
    if (!cartOpen) return;
    function handleMouseMove(e) {
      const icon = iconWrapRef.current;
      const popover = popoverRef.current;
      const isOverIcon = icon && icon.contains(e.target);
      const isOverPopover = popover && popover.contains?.(e.target);
      if (!isOverIcon && !isOverPopover) {
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            setCartOpen(false);
            timerRef.current = null;
          }, 160);
        }
      } else {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    }
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cartOpen]);

  // Закрывать поповер на переходы в корзину/чекаут
  useEffect(() => {
    if (location.pathname === '/cart' || location.pathname === '/checkout') {
      setCartOpen(false);
    }
  }, [location.pathname]);

  const handleCartClick = (e) => {
    if (location.pathname !== '/cart') {
      setCartOpen(false);
      navigate('/cart');
      e.preventDefault();
    }
  };

  // Языки
  const [lang, setLang] = useState('ru');
  const [langOpen, setLangOpen] = useState(false);
  const langDropdownRef = useRef();
  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  // Клик вне меню — закрывает список
  useEffect(() => {
    if (!langOpen) return;
    function handleClick(e) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [langOpen]);

  return (
    <>
      {user?.isAdmin && (
        <div className="admin-banner">
          <span className="admin-banner__text">У вас есть доступ к Панели администратора.</span>
          <button className="admin-banner__btn" onClick={() => navigate('/admin/orders')}>
            Перейти
          </button>
        </div>
      )}

      <header className="header-site">
        <div className="header">
          <div className="header__left">
            <Link to="/" className="logo" style={{ display: 'flex', alignItems: 'center' }}>
              {siteLogo ? (
                <img src={siteLogo} alt={siteName} className="site-logo-img" />
              ) : (
                siteName
              )}
            </Link>

            <Link to="/reviews" className="header-reviews-link" aria-label="Отзывы покупателей">
              Отзывы <span className="review-emoji">😊</span>
            </Link>
          </div>

          <div className="header__center">
            <div className="search-wrapper">
              <input type="text" className="search-input" placeholder="Поиск по каталогу..." />
              <button className="search-btn-inside" tabIndex={0} aria-label="Поиск">
                <img src="/images/lupa.webp" alt="Поиск" />
              </button>
            </div>

            {phone && (
              <div className="header-phones">
                <div className="header-phone-row">
                  <span className="phone-ico-animated phone-ico-large">
                    <img src="/images/phone.webp" alt="Телефон" />
                  </span>
                  {phoneVisible ? (
                    <span className="phone-number phone-visible">{phone}</span>
                  ) : (
                    <span className="phone-show-btn" onClick={handleShowPhone}>
                      Показать номер
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="header__right">
            {/* Язык */}
            <div className="lang-dropdown-wrap" ref={langDropdownRef}>
              <button
                type="button"
                className={`lang-dropdown-current${langOpen ? ' is-open' : ''}`}
                onClick={() => setLangOpen((v) => !v)}
                aria-expanded={langOpen}
                aria-haspopup="listbox"
              >
                {currentLang.label}
                <svg
                  className="lang-caret"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  style={{ marginLeft: 3, verticalAlign: 'middle' }}
                >
                  <path d="M4.3 6.7a1 1 0 0 1 1.4 0L8 9l2.3-2.3a1 1 0 0 1 1.4 1.4l-3 3a1 1 0 0 1-1.4 0l-3-3a1 1 0 0 1 0-1.4z" />
                </svg>
              </button>

              {langOpen && (
                <div className="lang-dropdown-list" role="listbox">
                  {LANGUAGES.filter((l) => l.code !== lang).map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      className="lang-dropdown-item"
                      onClick={() => {
                        setLang(l.code);
                        setLangOpen(false);
                      }}
                      role="option"
                      aria-selected={false}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Профиль */}
            <a href="/profile" className="profile-link" onClick={handleProfileClick} aria-label="Профиль">
              <img src="/images/Profil.webp" alt="Профиль" className="icon-large" />
            </a>

            {/* Корзина */}
            <div
              ref={iconWrapRef}
              style={{ position: 'relative', display: 'inline-block' }}
              onMouseEnter={() => setCartOpen(true)}
            >
              <a href="/cart" className="cart-link" onClick={handleCartClick} aria-label="Корзина">
                <img ref={cartIconRef} src="/images/Korzina.webp" alt="Корзина" className="icon-large cart-true" />
                {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
              </a>

              {location.pathname !== '/cart' && location.pathname !== '/checkout' && (
                <CartPopover ref={popoverRef} open={cartOpen} onClose={() => setCartOpen(false)} />
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;
