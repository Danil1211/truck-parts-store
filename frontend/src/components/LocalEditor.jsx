import React, { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";
import {
  Table,
  TableRow,
  TableHeader,
  TableCell,
} from "@tiptap/extension-table";
import "../assets/LocalEditor.css";

/* ================== Icons (inline SVG) ================== */
const Icon = {
  bold:  (a) => (<svg {...a} viewBox="0 0 24 24"><path d="M7 5h7a4 4 0 0 1 0 8H7zM7 13h8a4 4 0 0 1 0 8H7z"/></svg>),
  italic:(a) => (<svg {...a} viewBox="0 0 24 24"><path d="M10 4h10M4 20h10M14 4L10 20"/></svg>),
  underline:(a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M6 3v7a6 6 0 1 0 12 0V3M4 21h16"/></svg>),
  strike:(a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M4 12h16M6 7a5 5 0 0 1 5-3h2a5 5 0 0 1 5 5c0 3-3 4-7 5 0 0-5 1-5 4a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4"/></svg>),
  ul:    (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></svg>),
  ol:    (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 7V4h-1M3 12h2l-2 2h2M3 18h2"/></svg>),
  quote: (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M7 7h4v6H6v4H4v-6a4 4 0 0 1 3-4zM17 7h4v6h-5v4h-2v-6a4 4 0 0 1 3-4z"/></svg>),
  clear: (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M3 6h13l5 6-5 6H3zM6 6l12 12"/></svg>),
  link:  (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 7l-1 1"/><path d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 0 1-7-7l1-1"/></svg>),
  unlink:(a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M9 15l-1 1a5 5 0 1 1-7-7l2-2a5 5 0 0 1 7 7"/><path d="M15 9l1-1a5 5 0 1 1 7 7l-2 2a5 5 0 0 1-7-7"/><path d="M3 3l18 18"/></svg>),
  img:   (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M3 5h18v14H3z"/><path d="M3 15l5-5 4 4 2-2 6 6"/></svg>),
  left:  (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h16"/></svg>),
  center:(a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M4 18h16"/></svg>),
  right: (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M4 6h16M10 12h10M4 18h16"/></svg>),
  undo:  (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M9 14H4V9M20 20a8 8 0 1 0-16-6"/></svg>),
  redo:  (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M15 14h5V9M4 20a8 8 0 1 1 16-6"/></svg>),
  h1:    (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M4 6v12M12 6v12M4 12h8M18 18V6l-3 2"/></svg>),
  h2:    (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M4 6v12M12 6v12M4 12h8M16 8c2-1 4 0 4 2s-2 3-4 5h4v3"/></svg>),
  p:     (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M6 4h9a4 4 0 0 1 0 8H9v8H6z"/></svg>),
  table: (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M3 3h18v18H3zM3 9h18M9 3v18"/></svg>),
  source:(a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg>),
  tpl:   (a)=>(<svg {...a} viewBox="0 0 24 24"><path d="M4 4h16v6H4zM4 14h7v6H4zM13 14h7v6h-7z"/></svg>),
};

/* ================== FontSize extension ================== */
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            renderHTML: attrs => (attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {}),
            parseHTML: element => element.style.fontSize || null,
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

/* ================== Presets ================== */
const FONT_SIZES = [
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
];

export default function LocalEditor({
  value,
  onChange,
  placeholder = "Описание...",
  minHeight = 180,
}) {
  const [sourceMode, setSourceMode] = useState(false);
  const [fontSize, setFontSize] = useState("16px");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        blockquote: { HTMLAttributes: { class: "le-quote" } },
      }),
      Underline,
      Link.configure({
        autolink: true,
        openOnClick: false,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener nofollow",
          target: "_blank",
        },
        protocols: ["http", "https", "mailto", "tel"],
      }),
      Image.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    editorProps: {
      attributes: {
        class: "le-editor ProseMirror",
        spellCheck: "false",
        "aria-label": placeholder,
        style: `min-height:${minHeight}px`,
      },
      handlePaste(view, event) {
        // файл из буфера — вставляем как img
        const files = Array.from(event.clipboardData?.files || []).filter(f =>
          f.type.startsWith("image/")
        );
        if (files.length) {
          event.preventDefault();
          files.forEach((f) => {
            const r = new FileReader();
            r.onload = (e) => editor?.chain().focus().setImage({ src: e.target.result }).run();
            r.readAsDataURL(f);
          });
          return true;
        }
        return false; // остальное — по схеме редактора (без мусора)
      },
      handleDrop(view, event) {
        const files = Array.from(event.dataTransfer?.files || []).filter(f =>
          f.type.startsWith("image/")
        );
        if (files.length) {
          event.preventDefault();
          files.forEach((f) => {
            const r = new FileReader();
            r.onload = (e) => editor?.chain().focus().setImage({ src: e.target.result }).run();
            r.readAsDataURL(f);
          });
          return true;
        }
        return false;
      },
    },
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
      const fs = editor.getAttributes("textStyle")?.fontSize || "16px";
      setFontSize(fs);
    },
  });

  // внешняя синхронизация value -> editor (без циклов)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || "") !== current) editor.commands.setContent(value || "", false);
  }, [value, editor]);

  if (!editor) return null;

  /* ================== Toolbar helpers ================== */
  const setHeading = (level) =>
    level ? editor.chain().focus().setHeading({ level }).run()
          : editor.chain().focus().setParagraph().run();

  const toggleLink = async () => {
    const prev = editor.getAttributes("link")?.href;
    const url = window.prompt("Введите ссылку:", prev || "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href })
      .run();
  };

  const insertTemplate = () => {
    editor
      .chain()
      .focus()
      .insertContent(
        `<h2>Короткое описание</h2>
        <p>Ключевые особенности товара в 2–3 предложениях.</p>
        <h3>Характеристики</h3>
        <ul><li>Параметр 1</li><li>Параметр 2</li><li>Параметр 3</li></ul>`
      )
      .run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="le-root" onKeyDownCapture={(e) => e.stopPropagation()}>
      {/* Toolbar */}
      <div className="le-toolbar" onMouseDown={(e) => e.preventDefault()}>
        <div className="le-group">
          <button
            className={`le-btn ${editor.isActive("paragraph") ? "is-active" : ""}`}
            title="Абзац"
            onClick={() => setHeading(0)}
            aria-label="Абзац"
          >
            <Icon.p className="le-ico" />
          </button>
          <button
            className={`le-btn ${editor.isActive("heading", { level: 1 }) ? "is-active" : ""}`}
            title="H1"
            onClick={() => setHeading(1)}
            aria-label="H1"
          >
            <Icon.h1 className="le-ico" />
          </button>
          <button
            className={`le-btn ${editor.isActive("heading", { level: 2 }) ? "is-active" : ""}`}
            title="H2"
            onClick={() => setHeading(2)}
            aria-label="H2"
          >
            <Icon.h2 className="le-ico" />
          </button>
          <select
            className="le-select"
            value={fontSize}
            onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
            title="Размер шрифта"
            aria-label="Размер шрифта"
          >
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="le-group">
          <button className={`le-btn ${editor.isActive("bold") ? "is-active" : ""}`} title="Жирный (Ctrl/Cmd+B)"
                  onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">
            <Icon.bold className="le-ico" />
          </button>
          <button className={`le-btn ${editor.isActive("italic") ? "is-active" : ""}`} title="Курсив (Ctrl/Cmd+I)"
                  onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic">
            <Icon.italic className="le-ico" />
          </button>
          <button className={`le-btn ${editor.isActive("underline") ? "is-active" : ""}`} title="Подчеркнутый"
                  onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="Underline">
            <Icon.underline className="le-ico" />
          </button>
          <button className={`le-btn ${editor.isActive("strike") ? "is-active" : ""}`} title="Зачеркнутый"
                  onClick={() => editor.chain().focus().toggleStrike().run()} aria-label="Strike">
            <Icon.strike className="le-ico" />
          </button>
        </div>

        <div className="le-group">
          <button className={`le-btn ${editor.isActive("bulletList") ? "is-active" : ""}`} title="Список"
                  onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="UL">
            <Icon.ul className="le-ico" />
          </button>
          <button className={`le-btn ${editor.isActive("orderedList") ? "is-active" : ""}`} title="Нумерованный список"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="OL">
            <Icon.ol className="le-ico" />
          </button>
          <button className={`le-btn ${editor.isActive("blockquote") ? "is-active" : ""}`} title="Цитата"
                  onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Quote">
            <Icon.quote className="le-ico" />
          </button>
          <button className="le-btn" title="Очистить форматирование"
                  onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} aria-label="Clear">
            <Icon.clear className="le-ico" />
          </button>
        </div>

        <div className="le-group">
          <button className={`le-btn ${editor.isActive({ textAlign: "left" }) ? "is-active" : ""}`} title="По левому краю"
                  onClick={() => editor.chain().focus().setTextAlign("left").run()} aria-label="Align left">
            <Icon.left className="le-ico" />
          </button>
          <button className={`le-btn ${editor.isActive({ textAlign: "center" }) ? "is-active" : ""}`} title="По центру"
                  onClick={() => editor.chain().focus().setTextAlign("center").run()} aria-label="Align center">
            <Icon.center className="le-ico" />
          </button>
          <button className={`le-btn ${editor.isActive({ textAlign: "right" }) ? "is-active" : ""}`} title="По правому краю"
                  onClick={() => editor.chain().focus().setTextAlign("right").run()} aria-label="Align right">
            <Icon.right className="le-ico" />
          </button>
        </div>

        <div className="le-group">
          <button className={`le-btn ${editor.isActive("link") ? "is-active" : ""}`} title="Ссылка (Ctrl/Cmd+K)"
                  onClick={toggleLink} aria-label="Link">
            <Icon.link className="le-ico" />
          </button>
          <button className="le-btn" title="Удалить ссылку"
                  onClick={() => editor.chain().focus().unsetLink().run()} aria-label="Unlink">
            <Icon.unlink className="le-ico" />
          </button>
          <button className="le-btn" title="Изображение (URL или перетащи файл)"
                  onClick={() => {
                    const url = window.prompt("URL изображения:");
                    if (!url) return;
                    editor.chain().focus().setImage({ src: url.trim() }).run();
                  }} aria-label="Image">
            <Icon.img className="le-ico" />
          </button>
        </div>

        <div className="le-group">
          <button className="le-btn" title="Вставить шаблон" onClick={insertTemplate} aria-label="Template">
            <Icon.tpl className="le-ico" />
          </button>
          <button className="le-btn" title="Создать таблицу 3×3" onClick={insertTable} aria-label="Table">
            <Icon.table className="le-ico" />
          </button>
        </div>

        <div className="le-group -right">
          <button className="le-btn" title="Отменить (Ctrl/Cmd+Z)" onClick={() => editor.chain().focus().undo().run()} aria-label="Undo">
            <Icon.undo className="le-ico" />
          </button>
          <button className="le-btn" title="Повторить (Ctrl/Cmd+Y)" onClick={() => editor.chain().focus().redo().run()} aria-label="Redo">
            <Icon.redo className="le-ico" />
          </button>
          <button className={`le-btn ${sourceMode ? "is-active" : ""}`} title="Источник" onClick={() => setSourceMode(v => !v)} aria-label="Source">
            <Icon.source className="le-ico" />
          </button>
        </div>
      </div>

      {/* Editor / Source */}
      {!sourceMode ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          className="le-source"
          value={editor.getHTML()}
          onChange={(e) => editor.commands.setContent(e.target.value, false)}
          spellCheck={false}
        />
      )}
    </div>
  );
}
