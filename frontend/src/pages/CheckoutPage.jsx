import React, { useState } from "react";
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Header from "../components/Header";
import NavMenu from "../components/NavMenu";
import SideMenu from "../components/SideMenu";
import Footer from "../components/Footer";
import NovaPoshtaSelect from "../components/NovaPoshtaSelects";
import "../assets/CheckoutPage.css";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function CheckoutPage() {
  const { cartItems, clearCart } = useCart();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [surname, setSurname] = useState(user?.surname || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [npData, setNpData] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getImg = (images) => {
    if (!images || !images.length) return "/images/no-photo.png";
    let url = images[0];
    if (!url) return "/images/no-photo.png";
    if (/^https?:\/\//.test(url)) return url;
    if (url.startsWith("/")) return API_URL.replace(/\/$/, "") + url;
    return API_URL.replace(/\/$/, "") + "/" + url.replace(/^\/+/, "");
  };

  const totalPrice = cartItems.reduce((sum, item) => {
    const product = item.product || item;
    const price = Number(product.price) || 0;
    const quantity = item.quantity || item.qty || 1;
    return sum + price * quantity;
  }, 0);

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || item.qty || 1), 0);

  const handleOrder = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !surname || !phone) {
      setError("Заполните все обязательные поля");
      return;
    }

    const deliveryType = npData.deliveryType || "warehouse";
    let branchName = "";
    if (deliveryType === "warehouse" && npData.warehouse && (npData.warehouse.DescriptionRu || npData.warehouse.Description)) {
      branchName = npData.warehouse.DescriptionRu || npData.warehouse.Description;
    }
    if (deliveryType === "postomat" && npData.postomat && (npData.postomat.DescriptionRu || npData.postomat.Description)) {
      branchName = npData.postomat.DescriptionRu || npData.postomat.Description;
    }
    if (deliveryType === "courier" && npData.courierStreet && npData.courierHouse) {
      branchName = `Курьер: ${npData.courierStreet}, дом ${npData.courierHouse}${npData.courierApartment ? ', кв. ' + npData.courierApartment : ''}`;
    }

    const cityName = npData.cityName;

    if (!cityName || !branchName) {
      setError("Укажите город и отделение доставки");
      return;
    }

    if (cartItems.length === 0) {
      setError("Корзина пуста");
      return;
    }

    setLoading(true);

    try {
      const items = cartItems.map(item => ({
        product: (item.product?._id) || item._id,
        quantity: item.quantity || item.qty || 1
      }));

      const orderData = {
        items,
        address: cityName,
        novaPoshta: branchName,
        paymentMethod,
        comment,
        email,
        phone,
        name,
        surname,
        deliveryType,
      };

      const headers = { "Content-Type": "application/json" };
      const authToken = getToken();
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const response = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ошибка оформления заказа");

      clearCart();
      navigate("/thanks");
    } catch (err) {
      setError(err.message || "Ошибка оформления заказа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="checkout-page">
        <div className="main-container">
          <Header />
          <NavMenu />

          <div className="checkout-row">
            <div style={{ minWidth: 210 }}>
              <SideMenu />
            </div>

            <div className="checkout-content">
              <div className="block-title-info">ОФОРМЛЕНИЕ ЗАКАЗА</div>

              <form className="checkout-form" onSubmit={handleOrder}>
                {/* Контактные данные */}
                <div className="checkout-section-white">
                  <h3>Контактные данные</h3>
                  <div className="two-columns">
                    <div>
                      <label>Имя <span style={{ color: "red" }}>*</span></label>
                      <input
                        className="checkout-input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder="Ваше имя"
                      />
                    </div>
                    <div>
                      <label>Фамилия <span style={{ color: "red" }}>*</span></label>
                      <input
                        className="checkout-input"
                        value={surname}
                        onChange={e => setSurname(e.target.value)}
                        required
                        placeholder="Ваша фамилия"
                      />
                    </div>
                  </div>
                  <div className="two-columns">
                    <div>
                      <label>Телефон <span style={{ color: "red" }}>*</span></label>
                      <input
                        className="checkout-input"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                        placeholder="+380..."
                      />
                    </div>
                    <div>
                      <label>Email</label>
                      <input
                        className="checkout-input"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="E-mail (необязательно)"
                        type="email"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                </div>

                {/* Доставка */}
                <div className="checkout-section-white">
                  <h3>Доставка</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                    <img
                      src="/images/nova.png"
                      alt="Новая почта"
                      style={{ width: 32, height: 32, objectFit: "contain", display: "block" }}
                    />
                    <Link to="/delivery" className="delivery-link push-right">
                      Условия доставки
                    </Link>
                  </div>

                  {/* Скоупим стили НП, чтобы убрать синий hover/active */}
                  <div className="np-scope">
                    <NovaPoshtaSelect value={npData} onChange={setNpData} />
                  </div>
                </div>

                {/* Оплата */}
                <div className="checkout-section-white">
                  <h3>Оплата</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <Link to="/payment" className="delivery-link push-right">
                      Условия оплаты
                    </Link>
                  </div>
                  <div className="pay-methods-row">
                    <label className={`pay-method-card${paymentMethod === "cod" ? " selected" : ""}`}>
                      <input
                        type="radio"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        style={{ display: "none" }}
                      />
                      <div className="pay-method-icon">
                        <span role="img" aria-label="наличные" style={{ fontSize: 24 }}>💵</span>
                      </div>
                      <div>
                        <div className="pay-method-title">Оплата при получении</div>
                        <div className="pay-method-desc">Наличными или картой на отделении/курьеру</div>
                      </div>
                    </label>

                    <label className={`pay-method-card${paymentMethod === "card" ? " selected" : ""}`}>
                      <input
                        type="radio"
                        checked={paymentMethod === "card"}
                        onChange={() => setPaymentMethod("card")}
                        style={{ display: "none" }}
                      />
                      <div className="pay-method-icon">
                        <span role="img" aria-label="карта" style={{ fontSize: 24 }}>💳</span>
                      </div>
                      <div>
                        <div className="pay-method-title">Картой онлайн</div>
                        <div className="pay-method-desc">Visa/MasterCard, Apple Pay, Google Pay</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Комментарий */}
                <div className="checkout-section-white">
                  <h3>Комментарий к заказу</h3>
                  <textarea
                    id="order-comment"
                    className="checkout-input simple-comment"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Ваш комментарий для менеджера и службы доставки"
                    maxLength={500}
                  />
                  <div className="comment-hint-simple">
                    До 500 символов. Это поле не обязательно для заполнения.
                  </div>
                </div>

                {error && <div className="form-error">{error}</div>}

                <div className="checkout-actions single-center">
                  <button className="btn-order" disabled={loading} type="submit">
                    {loading ? "Оформляем..." : "Оформить заказ"}
                  </button>
                </div>

                {/* Ваш заказ */}
                <div className="checkout-section-white" style={{ marginBottom: 0 }}>
                  <h3>Ваш заказ</h3>
                  <ul className="order-list">
                    {cartItems.length === 0 ? (
                      <div style={{ padding: 16, color: "#666" }}>Корзина пуста</div>
                    ) : (
                      cartItems.map((item, i) => {
                        const product = item.product || item;
                        const imageUrl = getImg(product.images);
                        const nameText = product.name || "Без названия";
                        const code = product.code || product.sku || "—";
                        const price = Number(product.price) || 0;
                        const quantity = item.quantity || item.qty || 1;
                        return (
                          <li className="order-item" key={product._id || `item-${i}`}>
                            <div className="order-img-wrap">
                              <img src={imageUrl} alt={nameText} loading="lazy" />
                            </div>
                            <div className="order-info-block">
                              <Link to={`/product/${product._id}`} className="order-title">
                                {nameText}
                              </Link>
                              <div className="order-meta">
                                <span className="order-code">Код: {code}</span>
                              </div>
                            </div>
                            <div className="order-right-block">
                              <span className="order-qty-price">
                                <span className="order-price-unit">{price > 0 ? `${price.toLocaleString()} грн` : "—"}</span>
                                <span className="order-mult">&nbsp;×&nbsp;</span>
                                <span className="order-qty-num">{quantity}</span>
                                <span className="order-eq">&nbsp;=&nbsp;</span>
                                <span className="order-total-price">{(price * quantity).toLocaleString()} грн</span>
                              </span>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                  <div className="order-total">
                    Общая сумма заказа: {totalPrice.toLocaleString()} грн
                  </div>
                  <div className="order-items-count">
                    Товары в корзине: {totalItems} шт.
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
