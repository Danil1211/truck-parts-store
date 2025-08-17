import React, { useRef, useEffect, useState } from "react";

const FONT_SIZES = [
  { label: "10", value: "10px" },
  { label: "13", value: "13px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "22", value: "22px" },
  { label: "26", value: "26px" },
];
const BLOCKS = [
  { label: "Абзац", value: "P" },
  { label: "Заголовок 1", value: "H1" },
  { label: "Заголовок 2", value: "H2" },
  { label: "Заголовок 3", value: "H3" },
];

export default function LocalEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const [blockType, setBlockType] = useState("P");
  const [fontSize, setFontSize] = useState("16px");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  // Main "magic": execCommand + post-process <font> to <span>
  const handleFontSizeChange = (e) => {
    const px = e.target.value;
    setFontSize(px);
    document.execCommand("fontSize", false, 7); // ставит <font size="7">
    // Заменяем все font[size=7] на span с нужным font-size
    setTimeout(() => {
      if (!ref.current) return;
      ref.current.querySelectorAll("font[size='7']").forEach(font => {
        const span = document.createElement("span");
        span.style.fontSize = px;
        span.innerHTML = font.innerHTML;
        font.parentNode.replaceChild(span, font);
      });
      if (onChange) onChange(ref.current.innerHTML);
      ref.current.focus();
    }, 1);
  };

  const format = (cmd, param) => {
    document.execCommand(cmd, false, param);
    ref.current.focus();
    if (onChange) onChange(ref.current.innerHTML);
  };

  const handleBlockChange = (e) => {
    const val = e.target.value;
    setBlockType(val);
    format("formatBlock", val);
  };

  const insertImage = () => {
    const url = prompt("Вставьте ссылку на изображение:");
    if (url) format("insertImage", url);
  };

  const insertLink = () => {
    let url = prompt("Введите ссылку:");
    if (url && !/^https?:\/\//.test(url)) url = "https://" + url;
    if (url) format("createLink", url);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function handleDrop(e) {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
      if (files.length === 0) return;
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => {
          format("insertImage", ev.target.result);
        };
        reader.readAsDataURL(file);
      });
    }
    const handleDrag = e => e.preventDefault();
    el.addEventListener("drop", handleDrop);
    el.addEventListener("dragover", handleDrag);
    return () => {
      el.removeEventListener("drop", handleDrop);
      el.removeEventListener("dragover", handleDrag);
    };
  }, []);

  const showPlaceholder = (!ref.current?.innerText || ref.current?.innerText === "\n") && !isFocused;

  const styles = {
    root: {
      marginTop: 14,
      position: "relative",
      fontFamily: "'Segoe UI', 'Inter', sans-serif",
      borderRadius: 12,
      boxShadow: "0 2px 18px #1791ff0a",
      background: "#f6fafd",
      border: "1.5px solid #e6f2ff",
      overflow: "hidden",
      transition: "box-shadow .18s"
    },
    toolbar: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      padding: "9px 13px 5px 13px",
      background: "#f8fbff",
      borderBottom: "1px solid #e6f2ff",
      fontSize: 19,
      color: "#2291ff",
      userSelect: "none"
    },
    select: {
      fontSize: 15,
      color: "#2291ff",
      background: "#f6fafd",
      border: "1.1px solid #c9e4ff",
      borderRadius: 8,
      padding: "4px 10px",
      outline: "none",
      marginRight: 3,
      fontWeight: 500
    },
    button: {
      background: "none",
      border: "none",
      color: "#2291ff",
      fontWeight: 700,
      fontSize: 18,
      cursor: "pointer",
      padding: 2,
      outline: "none",
      borderRadius: 6,
      minWidth: 26,
      minHeight: 28,
      transition: "background 0.12s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    editor: {
      minHeight: 260,
      width: "100%",
      background: "#f8fbff",
      outline: "none",
      fontSize: 16,
      color: "#182533",
      border: "none",
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      transition: ".15s",
      padding: "18px 16px 15px 17px",
      resize: "vertical",
      overflow: "auto"
    },
    placeholder: {
      position: "absolute",
      zIndex: 2,
      left: 25,
      top: 68,
      color: "#a4b3c4",
      pointerEvents: "none",
      fontSize: 16,
      opacity: 0.9,
      userSelect: "none",
      letterSpacing: 0.3,
      fontWeight: 400
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.toolbar}>
        <select style={styles.select} value={blockType} onChange={handleBlockChange}>
          {BLOCKS.map(b => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        <select style={styles.select} value={fontSize} onChange={handleFontSizeChange}>
          {FONT_SIZES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button type="button" title="Жирный" style={styles.button} onClick={() => format("bold")}>B</button>
        <button type="button" title="Курсив" style={styles.button} onClick={() => format("italic")}>/</button>
        <button type="button" title="Подчёркнутый" style={styles.button} onClick={() => format("underline")}>U</button>
        <button type="button" title="Зачёркнутый" style={styles.button} onClick={() => format("strikeThrough")}>S</button>
        <button type="button" title="Undo" style={styles.button} onClick={() => format("undo")}>↺</button>
        <button type="button" title="Redo" style={styles.button} onClick={() => format("redo")}>↻</button>
        <button type="button" title="Вставить ссылку" style={styles.button} onClick={insertLink}>🔗</button>
        <button type="button" title="Удалить ссылку" style={styles.button} onClick={() => format("unlink")}>⛓️</button>
        <button type="button" title="Вставить изображение" style={styles.button} onClick={insertImage}>🖼️</button>
      </div>
      {showPlaceholder && (
        <span style={styles.placeholder}>{placeholder}</span>
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        style={styles.editor}
        onInput={e => onChange(e.currentTarget.innerHTML)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-label={placeholder}
        tabIndex={0}
        autoCorrect="off"
        autoComplete="off"
      />
    </div>
  );
}
