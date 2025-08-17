// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./assets/style.css";

// ====== Public pages ======
import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import ProfilePage from "./pages/ProfilePage";
import CheckoutPage from "./pages/CheckoutPage";
import ThanksPage from "./pages/ThanksPage";
import CatalogPage from "./pages/CatalogPage";
import LoginRegisterPage from "./pages/LoginRegisterPage";
import AboutTabsPage from "./pages/AboutTabsPage";
import GroupPage from "./pages/GroupPage";

// ====== Components ======
import PrivateRoute from "./components/PrivateRoute";
import ScrollToTop from "./components/ScrollToTop";
import AddToCartAnimation from "./components/AddToCartAnimation";
import ChatWidgetWrapper from "./components/ChatWidgetWrapper";
import ThemeSync from "./components/ThemeSync";

// ====== Context providers ======
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { SiteProvider, useSite } from "./context/SiteContext";
import { AdminNotifyProvider } from "./context/AdminNotifyContext";

// ====== Admin pages ======
import AdminLayout from "./admin/AdminLayout";
import AdminOrdersPage from "./admin/AdminOrdersPage";
import AdminChatPage from "./admin/AdminChatPage";
import AdminClientsPage from "./admin/AdminClientsPage";
import AdminClientDetailPage from "./admin/AdminClientDetailPage";
import AdminProductsPage from "./admin/AdminProductsPage";
import AdminGroupsPage from "./admin/AdminGroupsPage";
import AdminCreateGroupPage from "./admin/AdminCreateGroupPage";
import AdminEditGroupPage from "./admin/AdminEditGroupPage";
import AdminAddProductPage from "./admin/AdminAddProductPage";
import AdminEditProductPage from "./admin/AdminEditProductPage";
import AdminSettingsPage from "./admin/AdminSettingsPage";

// ====== Super Admin page ======
import SuperAdminPanel from "./superadmin/SuperAdminPanel";

// ====== SiteReady wrapper ======
function SiteReady({ children }) {
  const { display, loading } = useSite();
  if (loading || !display || !display.palette) return <div />;
  return (
    <>
      <ThemeSync />
      {children}
    </>
  );
}

// ====== Render app ======
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <SiteProvider>
      <SiteReady>
        <AuthProvider>
          <CartProvider>
            <Router>
              <ScrollToTop />
              <AddToCartAnimation />
              <ChatWidgetWrapper />
              <Routes>
                {/* ==== Public routes ==== */}
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/login" element={<LoginRegisterPage />} />
                <Route path="/register" element={<LoginRegisterPage />} />
                <Route
                  path="/profile"
                  element={
                    <PrivateRoute>
                      <ProfilePage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <PrivateRoute>
                      <CheckoutPage />
                    </PrivateRoute>
                  }
                />
                <Route path="/thanks" element={<ThanksPage />} />
                <Route path="/info" element={<AboutTabsPage />} />
                <Route path="/catalog" element={<CatalogPage />} />
                <Route path="/catalog/group/:groupId" element={<GroupPage />} />

                {/* ==== Admin routes ==== */}
                <Route
                  path="/admin/*"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <AdminNotifyProvider>
                        <AdminLayout />
                      </AdminNotifyProvider>
                    </PrivateRoute>
                  }
                >
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="products/create" element={<AdminAddProductPage />} />
                  <Route path="products/:id/edit" element={<AdminEditProductPage />} />
                  <Route path="groups" element={<AdminGroupsPage />} />
                  <Route path="groups/create" element={<AdminCreateGroupPage />} />
                  <Route path="groups/edit/:id" element={<AdminEditGroupPage />} />
                  <Route path="chat" element={<AdminChatPage />} />
                  <Route path="clients" element={<AdminClientsPage />} />
                  <Route path="clients/:id" element={<AdminClientDetailPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>

                {/* ==== Super Admin (Основатель) ==== */}
                <Route path="/superadmin" element={<SuperAdminPanel />} />
              </Routes>
            </Router>
          </CartProvider>
        </AuthProvider>
      </SiteReady>
    </SiteProvider>
  </React.StrictMode>
);
