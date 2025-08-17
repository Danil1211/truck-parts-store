import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import NavMenu from "../components/NavMenu";
import SideMenu from "../components/SideMenu";
import Footer from "../components/Footer";
import GroupCard from "../components/GroupCard";
import ProductCard from "../components/ProductCard";        // grid (как был)
import ProductCardList from "../components/ProductCardList"; // 👈 новый список
import Breadcrumbs from "../components/Breadcrumbs";

const apiUrl = import.meta.env.VITE_API_URL || "";

export default function GroupPage() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [subgroups, setSubgroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [ancestors, setAncestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    setLoading(true);
    fetch(`${apiUrl}/api/groups/${groupId}/full`)
      .then((res) => res.json())
      .then((data) => {
        setGroup(data.group);
        setSubgroups(data.subgroups || []);
        setProducts(data.products || []);
        setAncestors(
          (data.ancestors || []).concat(
            data.group ? [{ _id: data.group._id, name: data.group.name }] : []
          )
        );
      })
      .catch(() => {
        setGroup(null);
        setSubgroups([]);
        setProducts([]);
        setAncestors([]);
      })
      .finally(() => setLoading(false));
  }, [groupId, apiUrl]);

  if (loading) {
    return (
      <div className="main-container">
        <Header />
        <NavMenu />
        <div>Загрузка...</div>
        <Footer />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="main-container">
        <Header />
        <NavMenu />
        <div className="error">Группа не найдена!</div>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <div className="main-container">
        <Header />
        <NavMenu />
        <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
          <div style={{ minWidth: 210 }}>
            <SideMenu />
          </div>
          <div style={{ flex: 1 }}>
            <div
              className="block-title-info"
              style={{
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingRight: 10,
                paddingLeft: 0,
                color: "var(--color-primary)",
              }}
            >
              <b
                style={{
                  fontWeight: 700,
                  fontSize: "1.32rem",
                  color: "var(--color-title-alt)",
                  marginLeft: 24,
                  letterSpacing: ".02em",
                }}
              >
                {group?.name || "Группа"}
              </b>

              {products.length > 0 && (
                <div className="view-switcher">
                  <button
                    className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                    onClick={() => setViewMode("grid")}
                    aria-label="Вид сеткой"
                    type="button"
                    style={{ border: "1px solid var(--color-primary)" }}
                  >
                    <img src="/images/icon2.png" alt="Сетка" />
                  </button>
                  <button
                    className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                    onClick={() => setViewMode("list")}
                    aria-label="Вид списком"
                    type="button"
                    style={{ border: "1px solid var(--color-primary)" }}
                  >
                    <img src="/images/icon1.png" alt="Список" />
                  </button>
                </div>
              )}
            </div>

            <Breadcrumbs ancestors={ancestors} />
            <div style={{ height: 16 }} />

            {subgroups.length > 0 ? (
              <div className="groups-grid">
                {subgroups.map((sg) => (
                  <GroupCard key={sg._id} group={sg} />
                ))}
              </div>
            ) : products.length > 0 ? (
              viewMode === "grid" ? (
                <div className="products-grid three">
                  {products.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>
              ) : (
                <div className="products-list" style={{ display: "grid", gap: 14 }}>
                  {products.map((p) => (
                    <ProductCardList key={p._id} product={p} />
                  ))}
                </div>
              )
            ) : (
              <div className="empty-msg">В этой группе пока нет товаров.</div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
