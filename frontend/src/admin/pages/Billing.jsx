import React, { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export default function Billing() {
  const [info, setInfo] = useState(null);
  const [plans, setPlans] = useState({});

  useEffect(() => {
    fetch(`${API}/api/billing/me`).then(r=>r.json()).then(setInfo);
    fetch(`${API}/api/billing/plans`).then(r=>r.json()).then(setPlans);
  }, []);

  if (!info) return <div>Загрузка…</div>;

  const usageBar = (used, limit) => (
    <div style={{background:'#eee', borderRadius:8, height:10}}>
      <div style={{width: `${Math.min(100, (used/limit)*100)}%`, height:10, borderRadius:8, background:'#117fff'}} />
    </div>
  );

  return (
    <div className="billing-page">
      <h2>Тариф: {info.plan}</h2>
      <div className="billing-cards">
        <div className="card">
          <div>Товары: {info.usage.products} / {plans[info.plan].products}</div>
          {usageBar(info.usage.products, plans[info.plan].products)}
        </div>
        <div className="card">
          <div>Чаты: {info.usage.chats} / {plans[info.plan].chats}</div>
          {usageBar(info.usage.chats, plans[info.plan].chats)}
        </div>
        <div className="card">
          <div>Хранилище: {info.usage.storageMb} / {plans[info.plan].storageMb} Mb</div>
          {usageBar(info.usage.storageMb, plans[info.plan].storageMb)}
        </div>
      </div>

      <h3>Сменить план</h3>
      <div className="plan-buttons" style={{display:'flex', gap:12}}>
        {Object.keys(plans).map(p => (
          <button key={p}
            disabled={p===info.plan}
            onClick={async () => {
              await fetch(`${API}/api/billing/change`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plan: p }) });
              const me = await fetch(`${API}/api/billing/me`).then(r=>r.json());
              setInfo(me);
            }}>
            {p.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
