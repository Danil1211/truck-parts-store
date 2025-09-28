import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./assets/style.css";

/* Public pages */
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

/* Components */
import PrivateRoute from "./components/PrivateRoute";
import ScrollToTop from "./components/ScrollToTop";
import AddToCartAnimation from "./components/AddToCartAnimation";
import ChatWidgetWrapper from "./components/ChatWidgetWrapper";
import ThemeSync from "./components/ThemeSync";
import TokenCatcher from "./components/TokenCatcher";
import StoreNotFound from "./components/StoreNotFound";

/* Context */
import { CartProvider } from "./context/CartContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SiteProvider, useSite } from "./context/SiteContext";
import { AdminNotifyProvider } from "./context/AdminNotifyContext";

/* Admin pages */
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
import AdminLoginPage from "./admin/AdminLoginPage";

/* New pages */
import AdminChatSettingsPage from "./admin/AdminChatSettingsPage";
import AdminMarketLayoutPage from "./admin/AdminMarketLayoutPage";
import AdminMarketDesignPage from "./admin/AdminMarketDesignPage";
import AdminMarketAppsPage from "./admin/AdminMarketAppsPage";

/* ===== Wrappers ===== */
function SiteReady({ children }) {
  const { status, display } = useSite();
  if (status === "loading") return <div />;
  if (status === "notfound") return <StoreNotFound />;
  if (status === "error")
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#b91c1c" }}>Ошибка загрузки сайта</h1>
        <p style={{ marginTop: 8, color: "#555" }}>Попробуйте обновить страницу позже.</p>
      </div>
    );
  if (!display || !display.palette) return <div />;
  return (
    <>
      <ThemeSync />
      {children}
    </>
  );
}

function AdminGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <AdminLoginPage />;
  const canAdmin = user.role === "owner" || user.role === "admin" || user.isAdmin === true;
  if (canAdmin) return <Navigate to="/admin/orders" replace />;
  return <Navigate to="/" replace />;
}

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <SiteProvider>
      <SiteReady>
        <AuthProvider>
          <CartProvider>
            <Router>
              {/* Global helpers */}
              <TokenCatcher />
              <ScrollToTop />
              <AddToCartAnimation />
              <ChatWidgetWrapper />

              <Routes>
                {/* Public */}
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

                {/* Admin login (public) */}
                <Route path="/admin/login" element={<AdminLoginPage />} />

                {/* /admin root */}
                <Route path="/admin" element={<AdminGate />} />

                {/* Admin protected */}
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
                  {/* Orders */}
                  <Route path="orders" element={<AdminOrdersPage />} />

                  {/* Products & Groups */}
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="products/create" element={<AdminAddProductPage />} />
                  <Route path="products/:id/edit" element={<AdminEditProductPage />} />
                  <Route path="groups" element={<AdminGroupsPage />} />
                  <Route path="groups/create" element={<AdminCreateGroupPage />} />
                  <Route path="groups/edit/:id" element={<AdminEditGroupPage />} />

                  {/* Chat */}
                  <Route path="chat" element={<AdminChatPage />} />
                  {/* Chat settings moved out */}
                  <Route path="settings/chat" element={<AdminChatSettingsPage />} />

                  {/* Clients */}
                  <Route path="clients" element={<AdminClientsPage />} />
                  <Route path="clients/:id" element={<AdminClientDetailPage />} />

                  {/* Settings (Main + Site management) */}
                  <Route path="settings" element={<AdminSettingsPage />} />

                  {/* Market submenu */}
                  <Route path="market" element={<Navigate to="/admin/market/design" replace />} />
                  <Route path="market/layout" element={<AdminMarketLayoutPage />} />
                  <Route path="market/design" element={<AdminMarketDesignPage />} />
                  <Route path="market/apps" element={<AdminMarketAppsPage />} />
                </Route>

                {/* fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </CartProvider>
        </AuthProvider>
      </SiteReady>
    </SiteProvider>
  </React.StrictMode>
);
