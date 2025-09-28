import React from "react";
import AdminSubMenu from "./AdminSubMenu";
import "../assets/AdminPanel.css";
import "../assets/AdminSettingsPage.css";
import { useSite } from "../context/SiteContext";
import { DISPLAY_DEFAULT, PALETTES } from "../context/SiteContext";

const COLOR_PALETTE = ["#2291ff","#4caf50","#ff9800","#f44336","#e91e63","#a9744f","#9c27b0","#00bcd4"];
const TEMPLATES = [
  { key: "standard", label: "Стандартный", preview: "/images/standartdesing.png" },
  { key: "phoenix", label: "Феникс", preview: "/images/phoenix.png" },
  { key: "red-dove", label: "Красный Голубь", preview: "/images/red-dove.png" },
  { key: "turquoise-swallow", label: "Бирюзовая Ласточка", preview: "/images/turquoise-swallow.png" },
];

function getPaletteWithFooter(primary) {
  const base =
    PALETTES[primary] || { ...DISPLAY_DEFAULT.palette, primary, "footer-bg": "#232a34" };
  return { ...base, "side-menu-border": primary };
}

export default function AdminMarketDesignPage() {
  const { display, setDisplay, saveSettings } = useSite();
  const sitePrimary = display?.palette?.primary || COLOR_PALETTE[0];
  const selectColor = (c) => setDisplay((p) => ({ ...p, palette: getPaletteWithFooter(c) }));
  const apply = async () => { await saveSettings({ display }); };

  return (
    <div className="settings-page admin-content with-submenu">
      <AdminSubMenu type="market" />
      <div className="settings-body">
        <div className="admin-settings-root">
          <div className="settings-content">
            <div className="settings-content-inner">
              <div className="settings-section">
                <div className="settings-block">
                  <h3 className="settings-subtitle">Цвет сайта</h3>
                  <div className="design-palette-row">
                    {COLOR_PALETTE.map((c)=>(
                      <div key={c}
                           className={"design-color-circle"+(sitePrimary===c?" selected":"")}
                           style={{background:`linear-gradient(135deg, ${c} 48%, #fff 52%)`, borderColor:"#222"}}
                           onClick={()=>selectColor(c)} title={c}/>
                    ))}
                  </div>
                </div>

                <div className="settings-block">
                  <h3 className="settings-subtitle">Шаблон</h3>
                  <div className="design-templates-row">
                    {TEMPLATES.map((tpl)=>{
                      const isSelected = (display.template || "standard") === tpl.key;
                      return (
                        <label key={tpl.key} className={"design-template-label"+(isSelected?" selected":"")}>
                          <input type="radio" name="siteTemplate" value={tpl.key}
                                 checked={isSelected}
                                 onChange={()=>setDisplay(d=>({ ...d, template: tpl.key }))}
                                 style={{display:"none"}}/>
                          <img src={tpl.preview} alt={tpl.label} className="design-template-preview" />
                          <span className="design-template-title">{tpl.label}</span>
                          <button className="apply-template-btn" type="button"
                                  disabled={!isSelected} onClick={apply}>
                            Применить
                          </button>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="savebar" style={{marginTop:10}}>
                  <button className="primary" onClick={apply}>Сохранить</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
