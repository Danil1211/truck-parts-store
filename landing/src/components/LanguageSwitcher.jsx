import React from "react";
import { useLang } from "../context/LanguageContext";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className="border rounded px-2 py-1"
    >
      <option value="ua">UA</option>
      <option value="ru">RU</option>
      <option value="en">EN</option>
    </select>
  );
}
