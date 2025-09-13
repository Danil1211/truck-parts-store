import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/api.js";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminClientPage.css";

/* API маршруты */
const REGISTERED_PATHS = ["/api/users/admin","/api/admin/users","/api/clients/admin","/api/clients"];
const GUESTS_PATHS = ["/api/orders/guests","/api/admin/orders/guests","/api/orders?guest=1","/api/admin/orders?guest=1"];

/* Нормализация */
function normalizeRegistered(raw){
  const list = raw?.clients ?? raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  return (Array.isArray(list)?list:[]).map(u=>({
    id: u._id || u.id,
    firstName: u.firstName || u.name || "",
    lastName: u.lastName || "",
    email: u.email || "",
    phone: u.phone || "",
    createdAt: u.createdAt || u.registeredAt || null,
    ordersCount: Number(u.ordersCount ?? u.orders?.length ?? 0),
    rating: typeof u.rating === "number" ? u.rating : null,
  }));
}
function normalizeGuests(raw){
  const orders = raw?.orders ?? raw?.items ?? raw?.data ?? (Array.isArray(raw)?raw:[]);
  const map = new Map();
  (Array.isArray(orders)?orders:[]).forEach(o=>{
    const c=o.customer||o.client||{};
    const email=c.email||o.email||"";
    const phone=c.phone||o.phone||"";
    const name=c.name||c.fullName||o.name||"";
    const key=`${(email||"").toLowerCase()}|${phone}`;
    if(!map.has(key)){
      map.set(key,{id:key,firstName:name||"",lastName:"",email,phone,createdAt:o.createdAt||o.date||null,ordersCount:1,rating:null});
    }else{
      const it=map.get(key);
      it.ordersCount+=1;
      const d1=new Date(it.createdAt||0).getTime()||Infinity;
      const d2=new Date(o.createdAt||o.date||0).getTime()||Infinity;
      if(d2<d1) it.createdAt=o.createdAt||o.date||it.createdAt;
    }
  });
  return Array.from(map.values());
}

export default function AdminClientsPage(){
  const navigate = useNavigate();
  const location = useLocation();
  const tab = new URLSearchParams(location.search).get("tab") || "registered";

  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(false);
  const [q,setQ]=useState("");
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [error,setError]=useState("");
  const pageSize=20;

  useEffect(()=>{
    const controller=new AbortController();
    (async()=>{
      setLoading(true); setError("");
      const params={ q, page:String(page), limit:String(pageSize) };
      const paths = tab==="registered" ? REGISTERED_PATHS : GUESTS_PATHS;
      let ok=false;
      for(const p of paths){
        try{
          const {data}=await api.get(p,{params,signal:controller.signal});
          const list = tab==="registered" ? normalizeRegistered(data) : normalizeGuests(data);
          setRows(list);
          const t=data?.total ?? data?.count ?? data?.pagination?.total ?? list.length;
          setTotal(Number.isFinite(+t)?+t:list.length);
          ok=true; break;
        }catch(e){ if(e?.response?.status===404) continue; }
      }
      if(!ok){ setRows([]); setTotal(0); setError("Не удалось загрузить список."); }
      setLoading(false);
    })();
    return ()=>controller.abort();
  },[tab,q,page]);

  const totalPages=Math.max(1,Math.ceil(total/pageSize));

  return (
    <div className="clients-page admin-content with-submenu">
      {/* правое сабменю */}
      <AdminSubMenu type="clients" activeKey={tab} />

      {/* фиксированный хедер страницы (как в товарах) */}
      <div className="clients-header">
        <div className="clients-header-left">
          <h1 className="clients-h1">Клиенты</h1>
        </div>
        <div className="clients-header-right">
          <input
            className="clients-search"
            type="text"
            placeholder="Поиск (имя / email / телефон)…"
            value={q}
            onChange={(e)=>{ setPage(1); setQ(e.target.value); }}
          />
          <button className="btn-outline" type="button">Фильтры</button>
        </div>
      </div>

      {/* контент под фикс-хедером */}
      <div className="clients-content-wrap">
        <div className="clients-content">
          <div className="clients-table-wrap">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Клиент</th>
                  <th>Email</th>
                  <th>Телефон</th>
                  <th>{tab==="registered"?"Регистрация":"Первая покупка"}</th>
                  <th>Заказы</th>
                  <th>Рейтинг</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="loader-row"><span className="loader" /></td></tr>
                ) : error ? (
                  <tr><td className="error" colSpan={6}>{error}</td></tr>
                ) : rows.length===0 ? (
                  <tr><td className="center" colSpan={6}>Пусто</td></tr>
                ) : rows.map(c=>(
                  <tr
                    key={c.id}
                    className={tab==="registered"?"row clickable":"row"}
                    onClick={tab==="registered"?()=>navigate(`/admin/clients/${c.id}`):undefined}
                  >
                    <td className="name-cell">
                      <span className="avatar">{(c.firstName||c.lastName||"?").charAt(0)}</span>
                      <span>{[c.firstName,c.lastName].filter(Boolean).join(" ")||"—"}</span>
                    </td>
                    <td>{c.email||"—"}</td>
                    <td>{c.phone||"—"}</td>
                    <td>{c.createdAt?new Date(c.createdAt).toLocaleDateString():"—"}</td>
                    <td>{c.ordersCount??0}</td>
                    <td className="rating-cell">
                      <span className="stars">
                        {Array.from({length:5}).map((_,i)=>(
                          <span key={i} className={i<(c.rating??0)?"star on":"star"}>★</span>
                        ))}
                      </span>
                      <span className="rating-num">{c.rating??"—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages>1 && !loading && (
            <div className="clients-pager">
              <button className="page-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Назад</button>
              <span className="pager-info">{page} / {totalPages}</span>
              <button className="page-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>Вперёд →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
