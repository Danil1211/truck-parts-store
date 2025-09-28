import React from "react";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import "../assets/AdminSettingsPage.css";

export default function AdminMarketLayoutPage() {
  return (
    <div className="settings-page admin-content with-submenu">
      <AdminSubMenu type="market" />
      <div className="settings-body">
        <div className="admin-settings-root">
          <div className="settings-content">
            <div className="settings-content-inner">
              <div className="settings-section">
                <div className="settings-block">
                  <h3 className="settings-subtitle">Лейаут</h3>
                  <p>Здесь будет настройка лейаута маркетплейса (сеток, карточек, хедера и т.д.).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
