import React, { createContext, useContext, useState, useEffect } from "react";
import translations from "../i18n";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "ru");

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
