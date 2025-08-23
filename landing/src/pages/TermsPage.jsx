import React, { useState } from "react";
import translations from "../i18n";

export default function TermsPage() {
  const [lang] = useState(localStorage.getItem("lang") || "ru");
  const t = translations[lang];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{t.terms.title}</h1>
      {t.terms.sections.map((s, i) => (
        <div key={i} className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{s.title}</h2>
          <p className="text-slate-700">{s.text}</p>
        </div>
      ))}
    </div>
  );
}
