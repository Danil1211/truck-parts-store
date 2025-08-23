import React, { useState, useRef, useEffect } from "react";
import { useLang } from "../context/LanguageContext";

// флаги (SVG внутри, без зависимостей)
const flags = {
  ua: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className="w-5 h-5">
      <g fillRule="evenodd">
        <path fill="#005bbb" d="M0 0h640v240H0z" />
        <path fill="#ffd500" d="M0 240h640v240H0z" />
      </g>
    </svg>
  ),
  ru: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6" className="w-5 h-5">
      <rect width="9" height="3" y="0" fill="#fff" />
      <rect width="9" height="2" y="2" fill="#0039a6" />
      <rect width="9" height="1" y="4" fill="#d52b1e" />
    </svg>
  ),
  en: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="w-5 h-5">
      <clipPath id="t">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" strokeWidth="4" clipPath="url(#t)" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  ),
};

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const languages = [
    { code: "ua", label: "Українська" },
    { code: "ru", label: "Русский" },
    { code: "en", label: "English" },
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Кнопка */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white shadow-sm hover:bg-slate-50"
      >
        {flags[lang]}
        <span className="hidden sm:inline">{languages.find((l) => l.code === lang)?.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Выпадающий список */}
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border py-1 z-50">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-slate-100 ${
                lang === l.code ? "font-semibold text-indigo-600" : "text-slate-700"
              }`}
            >
              {flags[l.code]} {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
