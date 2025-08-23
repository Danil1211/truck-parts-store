import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import Home from "./pages/Home";
import TrialStart from "./pages/TrialStart";
import TermsPage from "./pages/TermsPage";
import { LanguageProvider } from "./context/LanguageContext"; // ✅

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trial/start" element={<TrialStart />} />
          <Route path="/terms" element={<TermsPage />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>
);
