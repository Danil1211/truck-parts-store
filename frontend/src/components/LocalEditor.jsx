import React, { useRef, useEffect, useState } from "react";

/* пресеты */
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

/* доступные теги (простая санитация) */
const ALLOWED = new Set([
  "P","BR","STRONG","B","EM","I","U","S","A",
  "UL","OL","LI","IMG","SPAN"
]);

export default function LocalEditor({
  value,
  onChange,
  placeholder = "Описание...",
  minHeight = 180,
}) {
  const ref = useRef(null);
  const [blockType, setBlockType] = useState("P");
  const [fontSize, setFontSize] = useState("16px");
  const [isFocused, setIsFocused] = useState(false);
  const [cmdState, setCmdState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    ul: false,
    ol: false,
  });

  /* ----- утилиты ----- */
  const inEditorSelection = () => {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const anchor = sel.anchorNode;
    const focus = sel.focusNode;
    const el = ref.current;
    return !!(el && anchor && el.contains(anchor) && el.contains(focus));
  };

  const preventBlurMouseDown = (e) => {
    // чтобы клики по тулбару не снимали фокус с редактора
    e.preventDefault();
  };

  const emitChange = () => {
    if (!ref.current) return;
    onChange?.(ref.current.innerHTML);
  };

  /* ----- инициализация ----- */
  useEffect(() => {
    // стараемся заставить Enter делать <p>, не <div>
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {}
  }, []);

  /* внешняя синхронизация value -> DOM */
  useEffect(() => {
    if (!ref.current) return;
    const html = value || "";
    if (ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
  }, [value]);

  /* состояние кнопок в тулбаре */
  useEffect(() => {
    const handleSel = () => {
      if (!inEditorSelection()) return;
      try {
        setCmdState({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline"),
          strikeThrough: document.queryCommandState("strikeThrough"),
          ul: document.queryCommandState("insertUnorderedList"),
          ol: document.queryCommandState("insertOrderedList"),
        });
      } catch {}
    };
    document.addEventListener("selectionchange", handleSel);
    return () => document.removeEventListener("selectionchange", handleSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- санитация вставки ----- */
  const sanitizeHtml = (dirty) => {
    if (!dirty) return "";
    const doc = new DOMParser().parseFromString(dirty, "text/html");
    const walk = (node) => {
      // текст — ок
      if (node.nodeType === Node.TEXT_NODE) return;

      // неразрешённый тег — разворачиваем детей наверх
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName;
        if (!ALLOWED.has(tag)) {
          const parent = node.parentNode;
          while (node.firstChild) parent.insertBefore(node.firstChild, node);
          parent.removeChild(node);
          return;
        }
        // унифицируем b/i в strong/em
        if (tag === "B") node.outerHTML = `<strong>${node.innerHTML}</strong>`;
        if (tag === "I") node.outerHTML = `<em>${node.innerHTML}</em>`;

        // чистим атрибуты
        [...node.attributes].forEach((attr) => {
          const n = attr.name.toLowerCase();
          if (tag === "A" && (n === "href" || n === "target" || n === "rel")) return;
          if (tag === "IMG" && (n === "src" || n === "alt")) return;
          if (tag === "SPAN" && n === "style") {
            // оставим только font-size
            const size = (attr.value || "")
              .split(";")
              .map((s) => s.trim())
              .filter((s) => /^font-size:/i.test(s))
              .join(";");
            if (size) node.setAttribute("style", size);
            else node.removeAttribute("style");
            return;
          }
          node.removeAttribute(attr.name);
        });

        // ссылки — безопасно
        if (tag === "A") {
          const href = node.getAttribute("href") || "";
          if (!/^https?:\/\//i.test(href)) node.setAttribute("href", `https://${href}`);
          node.setAttribute("rel", "noopener nofollow");
          node.setAttribute("target", "_blank");
        }
      }
      // рекурсия
      let child = node.firstChild;
      while (child) {
        const next = child.nextSibling;
        walk(child);
        child = next;
      }
    };
    walk(doc.body);
    return doc.body.innerHTML;
  };

  /* ----- exec комманды ----- */
  const exec = (cmd, param) => {
    if (!ref.current) return;
    ref.current.focus();
    try {
      document.execCommand(cmd, false, param);
    } catch {}
    emitChange();
  };

  const setBlock = (tag) => {
    setBlockType(tag);
    exec("formatBlock", tag);
  };

  const applyFontSize = (px) => {
    setFontSize(px);
    // Включаем CSS-режим, чтобы браузер не лепил <font size="..">
    try { document.execCommand("styleWithCSS", false, true); } catch {}
    document.execCommand("fontSize", false, "7");
    // заменяем <font size="7"> на <span style="font-size:px">
    setTimeout(() => {
      if (!ref.current) return;
      ref.current.querySelectorAll("font[size='7']").forEach((font) => {
        const span = document.createElement("span");
        span.style.fontSize = px;
        span.innerHTML = font.innerHTML;
        font.parentNode.replaceChild(span, font);
      });
      try { document.execCommand("styleWithCSS", false, false); } catch {}
      emitChange();
    }, 0);
  };

  /* ----- paste: чистим HTML ----- */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPaste = (e) => {
      if (!inEditorSelection()) return;
      e.preventDefault();
      const html = e.clipboardData.getData("text/html");
      const text = e.clipboardData.getData("text/plain");
      let toInsert = html ? sanitizeHtml(html) : (text || "")
        .split("\n").map((l) => l.replace(/</g,"&lt;").replace(/>/g,"&gt;"))
        .join("<br>");

      // вставляем как html
      try {
        document.execCommand("insertHTML", false, toInsert);
      } catch {
        // fallback
        const range = document.getSelection().getRangeAt(0);
        const frag = range.createContextualFragment(toInsert);
        range.deleteContents();
        range.insertNode(frag);
      }
      emitChange();
    };

    const onDrop = (e) => {
      // drag&drop картинок
      const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => exec("insertImage", ev.target.result);
        reader.readAsDataURL(file);
      });
    };

    const block = (e) => e.preventDefault();

    el.addEventListener("paste", onPaste);
    el.addEventListener("drop", onDrop);
    el.addEventListener("dragover", block);
    return () => {
      el.removeEventListener("paste", onPaste);
      el.removeEventListener("drop", onDrop);
      el.removeEventListener("dragover", block);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- placeholder ----- */
  const isEmpty =
    (!ref.current?.innerText || ref.current?.innerText.trim() === "") && !isFocused;

  /* ----- хоткеи + Enter ----- */
  const onKeyDown = (e) => {
    // не даём событиям вылезать наружу (чтобы цена/другие поля не ловили Ctrl+B и т.п.)
    e.stopPropagation();

    const mod = e.ctrlKey || e.metaKey;
    if (mod) {
      if (e.key.toLowerCase() === "b") { e.preventDefault(); exec("bold"); return; }
      if (e.key.toLowerCase() === "i") { e.preventDefault(); exec("italic"); return; }
      if (e.key.toLowerCase() === "u") { e.preventDefault(); exec("underline"); return; }
      if (e.key.toLowerCase() === "s") { e.preventDefault(); exec("strikeThrough"); return; }
      if (e.key.toLowerCase() === "k") { e.preventDefault(); onInsertLink(); return; }
      if (e.key.toLowerCase() === "z") { e.preventDefault(); exec("undo"); return; }
      if (e.key.toLowerCase() === "y") { e.preventDefault(); exec("redo"); return; }
    }
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      exec("insertLineBreak");
    }
  };

  /* ----- действия тулбара ----- */
  const onInsertImage = () => {
    const url = window.prompt("Вставьте ссылку на изображение:");
    if (url) exec("insertImage", url.trim());
  };

  const onInsertLink = (href) => {
    exec("createLink", href);
    const sel = document.getSelection();
    if (sel && sel.anchorNode) {
      const a = (ref.current || document).querySelector("a[href='" + href + "']");
      if (a) { a.setAttribute("target","_blank"); a.setAttribute("rel","noopener nofollow"); }
    }
  };

  const onInsertLinkPrompt = () => {
    let url = window.prompt("Введите ссылку:");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    onInsertLink(url.trim());
  };

  const onRemoveLink = () => exec("unlink");

  /* ----- рендер ----- */
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
      flexWrap: "wrap",
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
      userSelect: "none",
    }),
    editor: {
      minHeight,
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
    sep: { width: 8 },
  };

  return (
    <div style={styles.root} onKeyDownCapture={(e) => e.stopPropagation()}>
      <div style={styles.toolbar} onMouseDown={preventBlurMouseDown}>
        <select
          style={styles.select}
          value={blockType}
          onChange={(e) => setBlock(e.target.value)}
        >
          {BLOCKS.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>

        <select
          style={styles.select}
          value={fontSize}
          onChange={(e) => applyFontSize(e.target.value)}
        >
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <button type="button" title="Жирный (Ctrl/Cmd+B)" style={styles.btn(cmdState.bold)} onClick={() => exec("bold")}>B</button>
        <button type="button" title="Курсив (Ctrl/Cmd+I)" style={styles.btn(cmdState.italic)} onClick={() => exec("italic")}>I</button>
        <button type="button" title="Подчёркнутый (Ctrl/Cmd+U)" style={styles.btn(cmdState.underline)} onClick={() => exec("underline")}>U</button>
        <button type="button" title="Зачёркнутый (Ctrl/Cmd+S)" style={styles.btn(cmdState.strikeThrough)} onClick={() => exec("strikeThrough")}>S</button>

        <div style={styles.sep} />

        <button type="button" title="Список" style={styles.btn(cmdState.ul)} onClick={() => exec("insertUnorderedList")}>• *</button>
        <button type="button" title="Нумерованный список" style={styles.btn(cmdState.ol)} onClick={() => exec("insertOrderedList")}>1.</button>
        <button type="button" title="Цитата" style={styles.btn()} onClick={() => exec("formatBlock","BLOCKQUOTE")}>❝</button>
        <button type="button" title="Очистить форматирование" style={styles.btn()} onClick={() => exec("removeFormat")}>⨯</button>

        <div style={styles.sep} />

        <button type="button" title="Вставить ссылку (Ctrl/Cmd+K)" style={styles.btn()} onClick={onInsertLinkPrompt}>link</button>
        <button type="button" title="Удалить ссылку" style={styles.btn()} onClick={onRemoveLink}>unlink</button>
        <button type="button" title="Вставить изображение" style={styles.btn()} onClick={onInsertImage}>img</button>

        <div style={styles.sep} />

        <button type="button" title="Отменить (Ctrl/Cmd+Z)" style={styles.btn()} onClick={() => exec("undo")}>↺</button>
        <button type="button" title="Повторить (Ctrl/Cmd+Y)" style={styles.btn()} onClick={() => exec("redo")}>↻</button>
      </div>

      {isEmpty && <span style={styles.placeholder}>{placeholder}</span>}

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        style={styles.editor}
        onInput={() => {
          // отложим, чтобы брать уже применённые изменения
          requestAnimationFrame(emitChange);
        }}
        onFocus={(e) => { setIsFocused(true); e.stopPropagation(); }}
        onBlur={() => setIsFocused(false)}
        onKeyDown={onKeyDown}
        aria-label={placeholder}
        tabIndex={0}
        autoCorrect="off"
        autoComplete="off"
      />
    </div>
  );
}
