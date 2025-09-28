import React, { useEffect, useState } from "react";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import "../assets/AdminSettingsPage.css";
import { useSite } from "../context/SiteContext";

const WEEK_DAYS = [
  { key: "mon", label: "Пн" }, { key: "tue", label: "Вт" }, { key: "wed", label: "Ср" },
  { key: "thu", label: "Чт" }, { key: "fri", label: "Пт" }, { key: "sat", label: "Сб" },
  { key: "sun", label: "Вс" },
];
const COLORS = ["#2291ff","#4caf50","#ff9800","#f44336","#e91e63","#a9744f","#9c27b0","#00bcd4"];

export default function AdminChatSettingsPage() {
  const { contacts, setContacts, saveSettings } = useSite();
  const def = contacts?.chatSettings || {};
  const [start, setStart] = useState(def.startTime || "09:00");
  const [end, setEnd] = useState(def.endTime || "18:00");
  const [days, setDays] = useState(def.workDays || WEEK_DAYS.map(d=>d.key));
  const [pos, setPos] = useState(def.iconPosition || "left");
  const [color, setColor] = useState(def.color || "#2291ff");
  const [greeting, setGreeting] = useState(def.greeting || "");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const d = contacts?.chatSettings || {};
    setStart(d.startTime || "09:00");
    setEnd(d.endTime || "18:00");
    setDays(d.workDays || WEEK_DAYS.map(x=>x.key));
    setPos(d.iconPosition || "left");
    setColor(d.color || "#2291ff");
    setGreeting(d.greeting || "");
  }, [contacts]);

  const toggleDay = (key, on) => {
    setDays(prev => on ? [...prev, key] : prev.filter(x=>x!==key));
  };

  const save = async () => {
    await saveSettings({
      contacts: {
        ...contacts,
        chatSettings: { startTime:start, endTime:end, workDays:days, iconPosition:pos, color, greeting }
      }
    });
    setMsg("Настройки чата сохранены");
    setTimeout(()=>setMsg(""),2000);
  };

  return (
    <div className="settings-page admin-content with-submenu">
      <AdminSubMenu type="settings" />
      <div className="settings-body">
        <div className="admin-settings-root">
          <div className="settings-content">
            <div className="settings-content-inner">
              <div className="settings-section">
                <div className="settings-block">
                  <h3 className="settings-subtitle">Рабочее время</h3>
                  <div className="settings-grid-2">
                    <div>
                      <label>Начало</label>
                      <input type="time" value={start} onChange={(e)=>setStart(e.target.value)} className="settings-input-wide"/>
                    </div>
                    <div>
                      <label>Конец</label>
                      <input type="time" value={end} onChange={(e)=>setEnd(e.target.value)} className="settings-input-wide"/>
                    </div>
                  </div>

                  <div style={{marginTop:16}}>
                    <div className="settings-subtitle" style={{marginBottom:8}}>Рабочие дни</div>
                    <div className="chat-days-off-row">
                      {WEEK_DAYS.map((d)=>(
                        <label key={d.key} className="chat-days-off-label">
                          <input type="checkbox" checked={days.includes(d.key)} onChange={(e)=>toggleDay(d.key,e.target.checked)}/>
                          {d.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="settings-block">
                  <h3 className="settings-subtitle">Виджет</h3>
                  <div style={{marginTop:6}}>
                    <div style={{fontWeight:400, fontSize:16, marginBottom:8}}>Положение иконки</div>
                    <label style={{marginRight:20}}><input type="radio" name="pos" value="left"  checked={pos==="left"}  onChange={()=>setPos("left")}  /> Слева</label>
                    <label><input type="radio" name="pos" value="right" checked={pos==="right"} onChange={()=>setPos("right")} /> Справа</label>
                  </div>

                  <div className="settings-subtitle" style={{marginTop:16}}>Цвет</div>
                  <div className="chat-color-palette">
                    {COLORS.map(c=>(
                      <div key={c}
                           className={"color-circle"+(color===c?" selected":"")}
                           style={{background:`linear-gradient(135deg, ${c} 48%, #fff 52%)`, border:"2px solid #222"}}
                           onClick={()=>setColor(c)}
                      />
                    ))}
                  </div>

                  <div style={{marginTop:24}}>
                    <label htmlFor="chatGreeting" style={{display:"block", marginBottom:8}}>Приветствие</label>
                    <textarea id="chatGreeting" value={greeting} onChange={(e)=>setGreeting(e.target.value)}
                              className="settings-input-wide" rows={3} placeholder="Сообщение перед началом чата"/>
                  </div>
                </div>

                {msg && <div className="settings-success-message">{msg}</div>}
                <button className="settings-save-btn" onClick={save}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
