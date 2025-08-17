import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

function ThanksPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <h2>✅ Спасибо за заказ!</h2>
        <p>Мы скоро с вами свяжемся для подтверждения.</p>
        <Link to="/"
          style={{
            display: 'inline-block',
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-btn, #fff)',
            textDecoration: 'none',
            borderRadius: '4px'
          }}>
          Вернуться на главную
        </Link>
      </main>
      <Footer />
    </>
  );
}

export default ThanksPage;
