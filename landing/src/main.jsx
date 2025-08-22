// landing/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import Home from "./pages/Home";
import TrialStart from "./pages/TrialStart"; // страница: имя/фамилия/телефон

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trial/start" element={<TrialStart />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
