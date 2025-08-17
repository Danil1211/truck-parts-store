import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Header from '../components/Header';
import NavMenu from '../components/NavMenu';
import Breadcrumbs from '../components/Breadcrumbs';
import Footer from '../components/Footer';
import { ShoppingCart, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { cartIconRef } from '../components/Header';
import { triggerAddToCartFly } from '../components/AddToCartAnimation';
import ProductCard from '../components/ProductCard'; // если будет использоваться ниже
import '../assets/ProductPage.css';

const API_URL = import.meta.env.VITE_API_URL || "https://truck-parts-backend.onrender.com";

export default function ProductPage() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [ancestors, setAncestors] = useState([]);
  const [activeTab, setActiveTab] = useState('description');
  const imgRef = useRef();

  useEffect(() => {
    fetch(`${API_URL}/api/products/${id}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(async data => {
        setProduct(data);
        let groupChain = [];
        if (data.group && typeof data.group === "object") {
          groupChain = await getGroupAncestors(data.group);
        } else if (data.group && typeof data.group === "string") {
          const groupRes = await fetch(`${API_URL}/api/groups/${data.group}`);
          if (groupRes.ok) {
            const groupData = await groupRes.json();
            groupChain = await getGroupAncestors(groupData);
          }
        }
        setAncestors(groupChain);
      })
      .catch(() => setProduct(false));
  }, [id]);

  async function getGroupAncestors(groupObj) {
    let chain = [];
    let current = groupObj;
    while (current) {
      chain.unshift({ _id: current._id, name: current.name });
      if (current.parentGroup && typeof current.parentGroup === "object") {
        current = current.parentGroup;
      } else if (current.parentGroup) {
        const res = await fetch(`${API_URL}/api/groups/${current.parentGroup}`);
        if (res.ok) current = await res.json();
        else break;
      } else {
        break;
      }
    }
    return chain;
  }

  if (product === false) {
    return (
      <>
        <div className="main-container"><Header /><NavMenu /><div className="error">Ошибка загрузки товара</div></div>
        <Footer />
      </>
    );
  }
  if (!product) {
    return (
      <>
        <div className="main-container"><Header /><NavMenu /><div>Загрузка...</div></div>
        <Footer />
      </>
    );
  }

  let images = (product.images && product.images.length)
    ? product.images.map(img =>
        img.startsWith('http')
          ? img
          : `${API_URL.replace(/\/$/, '')}${img}`
      )
    : ["https://dummyimage.com/800x800/eeeeee/222.png&text=Нет+фото"];

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1200);

    if (imgRef.current && cartIconRef.current) {
      const fromRect = imgRef.current.getBoundingClientRect();
      const toRect = cartIconRef.current.getBoundingClientRect();
      triggerAddToCartFly(images[currentImg], fromRect, toRect);
    }
  };

  const nextImg = (e) => {
    e?.stopPropagation();
    setCurrentImg((prev) => (prev + 1) % images.length);
  };
  const prevImg = (e) => {
    e?.stopPropagation();
    setCurrentImg((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
      <div className="main-container">
        <Header />
        <NavMenu />
        <div className="product-main-flex">
          <div className="product-content-classic">
            <Breadcrumbs ancestors={ancestors} sku={product.sku} />
            <div className="product-page-row classic">
              <div className="gallery-classic">
                <div className="main-photo-classic" onClick={() => setShowModal(true)}>
                  <img ref={imgRef} src={images[currentImg]} alt={product.name} />
                </div>
                <div className="thumbs-classic">
                  {images.map((img, idx) => (
                    <div
                      className={`thumb-classic ${currentImg === idx ? 'active' : ''}`}
                      key={img + idx}
                      onClick={() => setCurrentImg(idx)}
                    >
                      <img src={img} alt={`Фото ${idx + 1}`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="info-classic">
                <h1 className="info-title">{product.name}</h1>
                <div className="info-articul">Артикул: <span>{product.sku}</span></div>
                <div className="info-unit">Ед. измерения: <span>{product.unit}</span></div>
                {product.manufacturer && (
                  <div className="info-manufacturer">
                    Код производителя: <span>{product.manufacturer}</span>
                  </div>
                )}
                {product.oldPrice && (
                  <div className="info-oldprice">
                    Розница: <span>{product.oldPrice?.toLocaleString('ru-RU')} грн.</span>
                  </div>
                )}
                <div className="info-price-row">
                  <span className="info-price-label">Цена:</span>
                  <span className="info-price">
                    {product.price?.toLocaleString('ru-RU')} грн.
                  </span>
                </div>
                <div className="info-qty-row">
                  <span>Количество:</span>
                  <button className="qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
                  <span className="qty-number">{quantity}</span>
                  <button className="qty-btn" onClick={() => setQuantity(q => q + 1)}>+</button>
                </div>
                <div className={product.availability ? "info-stock-green" : "info-stock-red"}>
                  {product.availability ? "В НАЛИЧИИ" : "Нет в наличии"}
                </div>
                <button className="cart-btn-classic" onClick={handleAddToCart}>
                  <ShoppingCart style={{ marginRight: 10 }} size={25} /> В корзину
                </button>
                {showToast && <div className="toast">Добавлено в корзину</div>}
              </div>
            </div>

            <div className="tabs-row-classic">
              <button
                className={`tab-classic ${activeTab === 'description' ? 'active' : ''}`}
                onClick={() => setActiveTab('description')}
              >
                Описание
              </button>
              <button
                className={`tab-classic ${activeTab === 'specs' ? 'active' : ''}`}
                onClick={() => setActiveTab('specs')}
              >
                Характеристики
              </button>
              <button
                className={`tab-classic ${activeTab === 'reviews' ? 'active' : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                Отзывы (0)
              </button>
            </div>
            <div className="tab-content-classic">
              {activeTab === 'description' && (
                (product.longDescription || product.description) ? (
                  <span dangerouslySetInnerHTML={{ __html: product.longDescription || product.description }} />
                ) : "Описание не указано."
              )}
              {activeTab === 'specs' && (
                product.specifications ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {Object.entries(product.specifications).map(([key, value]) => (
                        <tr key={key}>
                          <td style={{ borderBottom: '1px solid #ddd', padding: '8px', fontWeight: '600', width: '40%', color: '#18446e' }}>
                            {key}
                          </td>
                          <td style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>
                            {value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Характеристики отсутствуют.</p>
                )
              )}
              {activeTab === 'reviews' && <p>Отзывы пока отсутствуют.</p>}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-img-window" onClick={e => e.stopPropagation()}>
            <div className="modal-img-header">
              <span className="modal-title">{product.name}</span>
              {product.sku && (
                <span className="modal-sku">
                  Артикул: <b>{product.sku}</b>
                </span>
              )}
            </div>
            <img src={images[currentImg]} alt="Фото" />
            {images.length > 1 && (
              <>
                <button className="modal-arrow new left" onClick={prevImg} aria-label="Назад">
                  <ArrowLeft size={30} strokeWidth={2.1} />
                </button>
                <button className="modal-arrow new right" onClick={nextImg} aria-label="Вперёд">
                  <ArrowRight size={30} strokeWidth={2.1} />
                </button>
              </>
            )}
            <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Закрыть">
              <X size={32} strokeWidth={2.0} />
            </button>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
