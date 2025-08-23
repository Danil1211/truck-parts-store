import React from "react";
import { useLang } from "../context/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function TermsPage() {
  const { t } = useLang();
  const sections = t("terms.sections");

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-4 text-right">
        <LanguageSwitcher />
      </div>

      <h1 className="text-3xl font-bold mb-6">{t("terms.title")}</h1>

      <div className="space-y-6">
        {sections.map((s, i) => (
          <div key={i}>
            <h2 className="text-xl font-semibold">{s.title}</h2>
            <p className="text-slate-600 mt-2">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
