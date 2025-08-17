import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import NavMenu from "../components/NavMenu";
import SideMenu from "../components/SideMenu";
import Footer from "../components/Footer";
import GroupCard from "../components/GroupCard";

const apiUrl = import.meta.env.VITE_API_URL || "";

export default function CatalogPage() {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetch(`${apiUrl}/api/groups`)
      .then(res => res.json())
      .then(data => {
        setGroups(data.filter(g => g.name !== 'Родительская группа'));
      })
      .catch(err => setGroups([]));
  }, [apiUrl]);

  return (
    <div className="main-container">
      <Header />
      <NavMenu />
      <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
        <div style={{ minWidth: 210 }}>
          <SideMenu />
        </div>
        <div style={{ flex: 1 }}>
          <div className="block-title-info" style={{ marginBottom: 18 }}>
            <b>Каталог товаров</b>
          </div>
          <div className="groups-grid">
            {groups.map(group => (
              <GroupCard key={group._id} group={group} />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
