// src/pages/HomePage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard';
import GroupCard from '../components/GroupCard';
import SideMenu from '../components/SideMenu';
import Header from '../components/Header';
import NavMenu from '../components/NavMenu';
import Banner from '../components/Banner';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { useSite } from '../context/SiteContext';
import '../assets/HomePage.css';

const apiUrl = import.meta.env.VITE_API_URL || '';

function HomePage() {
  const [groups, setGroups] = useState([]);
  const [showcase, setShowcase] = useState([]);
  const [promos, setPromos] = useState([]);
  const [recent, setRecent] = useState([]);
  const [recommend, setRecommend] = useState([]);
  const [blog, setBlog] = useState([]);
  const { addToCart } = useCart();
  const { display } = useSite();

  // --- Для надёжности: если display нет, показываем всё ---
  const canShow = (key) => (display && key in display ? !!display[key] : true);

  // Витрина включена?
  const showcaseEnabled = useMemo(() => canShow('showcase'), [display]);

  // Категории — только верхний уровень!
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/groups`);
        const data = await res.json();
        const filtered = (Array.isArray(data) ? data : []).filter(
          (g) => !g.parentId && g.name !== 'Родительская группа'
        );
        setGroups(filtered);
      } catch (err) {
        console.error('Ошибка загрузки групп:', err);
        setGroups([]);
      }
    })();
  }, []);

  // Витрина — запрашиваем только если она включена
  useEffect(() => {
    if (!showcaseEnabled) {
      setShowcase([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/products/showcase`);
        const data = await res.json();
        setShowcase((Array.isArray(data) ? data : []).slice(0, 24));
      } catch {
        setShowcase([]);
      }
    })();
  }, [showcaseEnabled]);

  // Акции
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/promos`);
        setPromos(await res.json());
      } catch {
        setPromos([]);
      }
    })();
  }, []);

  // Недавно просмотренные
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/products/recent`);
        setRecent(await res.json());
      } catch {
        setRecent([]);
      }
    })();
  }, []);

  // Рекомендации
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/products/recommend`);
        setRecommend(await res.json());
      } catch {
        setRecommend([]);
      }
    })();
  }, []);

  // Блог
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/blog`);
        setBlog(await res.json());
      } catch {
        // мок, если бэк блога пуст
        setBlog([
          {
            _id: '1',
            title: 'Как выбрать тормозные колодки для тягача',
            date: '15.07.2025',
            preview: 'Краткое описание или начало статьи...',
          },
          {
            _id: '2',
            title: 'ТОП-5 расходников для грузовиков DAF',
            date: '10.07.2025',
            preview: 'В этой статье расскажем про...',
          },
        ]);
      }
    })();
  }, []);

  return (
    <>
      <div className="main-container">
        <Header />
        <NavMenu />
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            width: '100%',
            marginTop: 16,
            gap: 24,
          }}
        >
          <div style={{ minWidth: 210 }}>
            <SideMenu />
          </div>
          <div style={{ flex: 1 }}>
            {/* --- БАННЕР --- */}
            <Banner />

            {/* --- КАТЕГОРИИ --- */}
            {canShow('categories') && (
              <>
                <div className="block-title-info">
                  <b>КАТЕГОРИИ</b>
                </div>
                <section className="groups-row-root">
                  <div className="groups-grid">
                    {groups.map((group) => (
                      <GroupCard key={group._id} group={group} />
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* --- ВИТРИНА --- (без заглушек — рендерим только если есть товары) */}
            {showcaseEnabled && showcase.length > 0 && (
              <section className="showcase-root" style={{ margin: '36px 0' }}>
                <div className="block-title-info">
                  <b>ВИТРИНА</b>
                </div>
                <div className="products-grid">
                  {showcase.map((prod) => (
                    <ProductCard key={prod._id} product={prod} onAddToCart={addToCart} />
                  ))}
                </div>
              </section>
            )}

            {/* --- АКЦИИ --- */}
            {canShow('promos') && (
              <section className="promo-block" style={{ margin: '36px 0' }}>
                <div className="block-title-info">
                  <b>АКЦИИ И СКИДКИ</b>
                </div>
                <div className="products-grid">
                  {(promos.length ? promos : [1, 2, 3, 4]).map((promo, i) =>
                    promo ? (
                      <div key={promo._id || i} className="promo-card">
                        <h4>{promo.title || 'Акция'}</h4>
                        <p>{promo.desc || 'Описание акции...'}</p>
                      </div>
                    ) : (
                      <div
                        key={`pr-${i}`}
                        style={{
                          width: 240,
                          height: 120,
                          background: '#fff6e9',
                          borderRadius: 12,
                        }}
                      />
                    )
                  )}
                </div>
              </section>
            )}

            {/* --- БЛОГ --- */}
            {canShow('blog') && (
              <section className="blog-block" style={{ margin: '36px 0' }}>
                <div className="block-title-info">
                  <b>БЛОГ</b>
                </div>
                <div className="blog-grid">
                  {(blog.length ? blog : [1, 2, 3, 4]).map((post, i) =>
                    post ? (
                      <div key={post._id || i} className="blog-card">
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 18,
                            marginBottom: 6,
                          }}
                        >
                          {post.title}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: '#8c8c8c',
                            marginBottom: 8,
                          }}
                        >
                          {post.date}
                        </div>
                        <div style={{ fontSize: 15 }}>{post.preview}</div>
                      </div>
                    ) : (
                      <div
                        key={`bl-${i}`}
                        style={{
                          width: 270,
                          height: 110,
                          background: '#f6fafd',
                          borderRadius: 10,
                        }}
                      />
                    )
                  )}
                </div>
              </section>
            )}

            {/* --- НЕДАВНО ПРОСМОТРЕННЫЕ --- */}
            <section className="recent-products-root" style={{ margin: '36px 0' }}>
              <div className="block-title-info">
                <b>НЕДАВНО ПРОСМОТРЕННЫЕ</b>
              </div>
              <div className="products-grid">
                {(recent.length ? recent : [1, 2, 3, 4]).map((prod, i) =>
                  prod ? (
                    <ProductCard
                      key={prod._id || `rc-${i}`}
                      product={prod}
                      onAddToCart={addToCart}
                    />
                  ) : (
                    <div
                      key={`rc-ph-${i}`}
                      style={{
                        width: 240,
                        height: 320,
                        background: '#f6fafd',
                        borderRadius: 12,
                      }}
                    />
                  )
                )}
              </div>
            </section>

            {/* --- МЫ РЕКОМЕНДУЕМ --- */}
            <section className="recommend-products-root" style={{ margin: '36px 0' }}>
              <div className="block-title-info">
                <b>МЫ РЕКОМЕНДУЕМ</b>
              </div>
              <div className="products-grid">
                {(recommend.length ? recommend : [1, 2, 3, 4]).map((prod, i) =>
                  prod ? (
                    <ProductCard
                      key={prod._id || `rec-${i}`}
                      product={prod}
                      onAddToCart={addToCart}
                    />
                  ) : (
                    <div
                      key={`rec-ph-${i}`}
                      style={{
                        width: 240,
                        height: 320,
                        background: '#f6fafd',
                        borderRadius: 12,
                      }}
                    />
                  )
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default HomePage;
