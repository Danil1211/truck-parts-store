import React, { useRef, useEffect, useState } from "react";

/* компактные пресеты */
const FONT_SIZES = [
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
];
const BLOCKS = [
  { label: "Абзац", value: "P" },
  { label: "H1", value: "H1" },
  { label: "H2", value: "H2" },
  { label: "H3", value: "H3" },
];

export default function LocalEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const [blockType, setBlockType] = useState("P");
  const [fontSize, setFontSize] = useState("16px");
  const [isFocused, setIsFocused] = useState(false);
  const [cmdState, setCmdState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  });

  /* синк значения из вне */
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  /* отслеживаем состояние форматирования для подсветки кнопок */
  useEffect(() => {
    const handleSel = () => {
      try {
        setCmdState({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline"),
          strikeThrough: document.queryCommandState("strikeThrough"),
        });
      } catch {}
    };
    document.addEventListener("selectionchange", handleSel);
    return () => document.removeEventListener("selectionchange", handleSel);
  }, []);

  /* execCommand + нотация span для размера шрифта */
  const handleFontSizeChange = (e) => {
    const px = e.target.value;
    setFontSize(px);
    document.execCommand("fontSize", false, 7);
    setTimeout(() => {
      if (!ref.current) return;
      ref.current.querySelectorAll("font[size='7']").forEach((font) => {
        const span = document.createElement("span");
        span.style.fontSize = px;
        span.innerHTML = font.innerHTML;
        font.parentNode.replaceChild(span, font);
      });
      if (onChange) onChange(ref.current.innerHTML);
      ref.current.focus();
    }, 1);
  };

  const exec = (cmd, param) => {
    document.execCommand(cmd, false, param);
    ref.current?.focus();
    onChange?.(ref.current?.innerHTML || "");
  };

  const handleBlockChange = (e) => {
    const val = e.target.value;
    setBlockType(val);
    exec("formatBlock", val);
  };

  const insertImage = () => {
    const url = prompt("Вставьте ссылку на изображение:");
    if (url) exec("insertImage", url);
  };

  const insertLink = () => {
    let url = prompt("Введите ссылку:");
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    if (url) exec("createLink", url);
  };

  /* drag&drop изображений */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onDrop = (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => exec("insertImage", ev.target.result);
        reader.readAsDataURL(file);
      });
    };
    const block = (e) => e.preventDefault();
    el.addEventListener("drop", onDrop);
    el.addEventListener("dragover", block);
    return () => {
      el.removeEventListener("drop", onDrop);
      el.removeEventListener("dragover", block);
    };
  }, []);

  const isEmpty =
    (!ref.current?.innerText || ref.current?.innerText.trim() === "") &&
    !isFocused;

  /* стили — строгий минимализм, цвета берём из темы */
  const styles = {
    root: {
      marginTop: 10,
      position: "relative",
      borderRadius: 12,
      background: "var(--surface)",
      border: "1px solid #e6ebf2",
      overflow: "hidden",
    },
    toolbar: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 10px",
      background: "var(--surface)",
      borderBottom: "1px solid #e6ebf2",
    },
    select: {
      height: 30,
      fontSize: 13,
      color: "#0f172a",
      background: "#f9fbfd",
      border: "1px solid #d0d7e2",
      borderRadius: 8,
      padding: "0 10px",
      outline: "none",
    },
    btn: (active = false) => ({
      height: 30,
      minWidth: 30,
      padding: "0 8px",
      borderRadius: 8,
      border: active ? "1px solid #bcdcff" : "1px solid transparent",
      background: active ? "rgba(17,127,255,.12)" : "transparent",
      color: active ? "var(--primary)" : "#475569",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    }),
    editor: {
      minHeight: 180,
      width: "100%",
      outline: "none",
      fontSize: 14,
      lineHeight: 1.6,
      color: "#0f172a",
      background: "#fff",
      padding: "14px 14px",
    },
    placeholder: {
      position: "absolute",
      left: 16,
      top: 48,
      color: "#8fa0b3",
      pointerEvents: "none",
      fontSize: 14,
    },
  };

  return (
    <div style={styles.root}>
      <div style={styles.toolbar}>
        <select style={styles.select} value={blockType} onChange={handleBlockChange}>
          {BLOCKS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>

        <select style={styles.select} value={fontSize} onChange={handleFontSizeChange}>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <button type="button" title="Жирный" style={styles.btn(cmdState.bold)} onClick={() => exec("bold")}>
          B
        </button>
        <button type="button" title="Курсив" style={styles.btn(cmdState.italic)} onClick={() => exec("italic")}>
          I
        </button>
        <button type="button" title="Подчёркнутый" style={styles.btn(cmdState.underline)} onClick={() => exec("underline")}>
          U
        </button>
        <button
          type="button"
          title="Зачёркнутый"
          style={styles.btn(cmdState.strikeThrough)}
          onClick={() => exec("strikeThrough")}
        >
          S
        </button>

        <div style={{ width: 8 }} />

        <button type="button" title="Undo" style={styles.btn()} onClick={() => exec("undo")}>
          ↺
        </button>
        <button type="button" title="Redo" style={styles.btn()} onClick={() => exec("redo")}>
          ↻
        </button>

        <div style={{ width: 8 }} />

        <button type="button" title="Вставить ссылку" style={styles.btn()} onClick={insertLink}>
          link
        </button>
        <button type="button" title="Удалить ссылку" style={styles.btn()} onClick={() => exec("unlink")}>
          unlink
        </button>
        <button type="button" title="Вставить изображение" style={styles.btn()} onClick={insertImage}>
          img
        </button>
      </div>

      {isEmpty && <span style={styles.placeholder}>{placeholder}</span>}

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        style={styles.editor}
        onInput={(e) => onChange?.(e.currentTarget.innerHTML)}
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
