import React, { createContext, useContext, useState, useEffect } from "react";
import translations from "../i18n";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const getDefaultLang = () => {
    const saved = localStorage.getItem("lang");
    if (saved) return saved;

    const browserLang = navigator.language.toLowerCase();

    if (browserLang.startsWith("uk") || browserLang.startsWith("ua")) return "ua";
    if (browserLang.startsWith("ru")) return "ru";
    if (browserLang.startsWith("en")) return "en";

    // ⚡️ всё остальное — английский
    return "en";
  };

  const [lang, setLang] = useState(getDefaultLang);

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const t = (keyPath) => {
    const keys = keyPath.split(".");
    let value = translations[lang];
    for (let k of keys) {
      if (value?.[k] === undefined) return keyPath;
      value = value[k];
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
