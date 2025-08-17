import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ru: {
    translation: {
      welcome: "Добро пожаловать в магазин автозапчастей",
      cart: "Корзина",
      login: "Войти",
      logout: "Выйти",
      product: "Товар"
    }
  },
  ua: {
    translation: {
      welcome: "Ласкаво просимо до магазину автозапчастин",
      cart: "Кошик",
      login: "Увійти",
      logout: "Вийти",
      product: "Товар"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ru',
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
