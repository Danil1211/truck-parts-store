import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useSite } from "../context/SiteContext";
import '../assets/ChatWindow.css';

const apiUrl = import.meta.env.VITE_API_URL || "";

/* ====================== helpers (цвет) ====================== */
function lightenColor(hex, percent) {
  let r = parseInt(hex.substr(1,2),16), g = parseInt(hex.substr(3,2),16), b = parseInt(hex.substr(5,2),16);
  r = Math.round(r + (255 - r) * percent/100);
  g = Math.round(g + (255 - g) * percent/100);
  b = Math.round(b + (255 - b) * percent/100);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
function hexToRgba(hex, alpha) {
  let r = parseInt(hex.substr(1,2),16), g = parseInt(hex.substr(3,2),16), b = parseInt(hex.substr(5,2),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function safeParseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

/* ====================== helpers (страница) =================== */
function getPageMeta() {
  const { href, pathname, search, hash } = window.location;
  const pagePath = `${pathname}${search}${hash}`;
  return {
    pageUrl: pagePath || "/",
    pageHref: href,
    referrer: document.referrer || null,
    title: document.title || null,
  };
}
/** Патчим pushState/replaceState, чтобы ловить SPA-навигацию */
function patchHistory(onChange) {
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args) {
    const ret = origPush.apply(this, args);
    try { onChange(); } catch {}
    return ret;
  };
  history.replaceState = function (...args) {
    const ret = origReplace.apply(this, args);
    try { onChange(); } catch {}
    return ret;
  };
  return () => { history.pushState = origPush; history.replaceState = origReplace; };
}

/* ===================== анимация "печатает" ================== */
function TypingAnimation() {
  const [dots, setDots] = useState("...");
  useEffect(() => {
    const arr = ["...", "..", ".", ""];
    let i = 0;
    const t = setInterval(() => { setDots(arr[i % arr.length]); i++; }, 350);
    return () => clearInterval(t);
  }, []);
  return <span style={{ marginLeft: 3 }}>{dots}</span>;
}

/* ===================== голосовые ============================ */
const VoiceMessage = ({ url }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => setCurrent(audio.currentTime);
    const loaded = () => setDuration(audio.duration || 0);
    const end = () => setPlaying(false);
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', loaded);
    audio.addEventListener('ended', end);
    return () => {
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('loadedmetadata', loaded);
      audio.removeEventListener('ended', end);
    };
  }, []);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const handleSeek = (e) => {
    const bar = e.target.closest('.voice-bar2');
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.min(Math.max(percent, 0), 1) * duration;
  };

  const fmt = (sec) => {
    if (!isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="voice-modern-container">
      <audio ref={audioRef} src={url} preload="auto" style={{ display: 'none' }} />
      <button className={`voice-modern-btn ${playing ? 'pause' : 'play'}`} onClick={handlePlayPause}>
        {playing
          ? (<svg width="20" height="20" viewBox="0 0 20 20"><rect x="4" y="4" width="4" height="12" rx="2"/><rect x="12" y="4" width="4" height="12" rx="2"/></svg>)
          : (<svg width="20" height="20" viewBox="0 0 20 20"><polygon points="5,3 17,10 5,17" /></svg>)
        }
      </button>
      <div className="voice-bar2" onClick={handleSeek}>
        <div className="voice-bar-bg" />
        <div className="voice-bar2-progress" style={{ width: duration ? `${(current / duration) * 100}%` : 0 }} />
      </div>
      <span className="voice-modern-time">
        {fmt(current)}<span style={{ opacity: 0.7, fontWeight: 400 }}> / {fmt(duration)}</span>
      </span>
    </div>
  );
};

/* ======================== основной компонент ======================= */
const ChatWindow = ({ onClose }) => {
  // форма регистрации (для НЕ залогиненных на сайте)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // чат
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  // токены
  const [chatToken, setChatToken] = useState(localStorage.getItem('chatToken') || null);
  const siteToken = localStorage.getItem('token') || localStorage.getItem('authToken') || null;
  const effectiveToken = chatToken || siteToken;

  // вложения/голосовые
  const [images, setImages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordTime, setRecordTime] = useState(0);

  // прочее
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const mediaRecorder = useRef(null);
  const shouldScrollToBottom = useRef(true);
  const recordTimer = useRef(null);

  // цветовая тема
  const { chatSettings } = useSite();
  const chatColor = chatSettings?.color || "#2291ff";
  const chatGradient = `linear-gradient(135deg, ${chatColor}, ${lightenColor(chatColor, 30)})`;
  const shadowColor = hexToRgba(chatColor, 0.5);
  const shadowColor2 = hexToRgba(chatColor, 0);

  // userId/userName из JWT (любой из двух токенов)
  let userId = null, userName = null;
  if (effectiveToken) {
    const payload = safeParseJwt(effectiveToken);
    userId = payload?.id || null;
    userName = payload?.name || null;
  }

  /* ======================== запись голоса ======================== */
  const startRecording = async () => {
    if (!navigator.mediaDevices) {
      setError('Браузер не поддерживает запись');
      setTimeout(() => setError(''), 2000);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      setAudioChunks([]);
      mediaRecorder.current = recorder;
      recorder.ondataavailable = (e) => setAudioChunks((prev) => [...prev, e.data]);
      recorder.onstop = () => {};
      recorder.start();
      setIsRecording(true);
      setRecordTime(0);
      recordTimer.current = setInterval(() => setRecordTime((prev) => prev + 1), 1000);
    } catch {
      setError('Не удалось начать запись');
      setTimeout(() => setError(''), 2000);
    }
  };
  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      clearInterval(recordTimer.current);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    shouldScrollToBottom.current = (scrollTop + clientHeight >= scrollHeight - 10);
  };

  /* ======================== presence/страница ==================== */
  const sendPresence = async () => {
    if (!effectiveToken) return;
    const meta = getPageMeta();
    try {
      await fetch(`${apiUrl}/api/chat/ping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveToken}`
        },
        body: JSON.stringify(meta),
      });
    } catch {}
  };

  useEffect(() => {
    if (!effectiveToken) return;
    sendPresence(); // при монтировании
    const onNav = () => sendPresence();
    const unpatch = patchHistory(onNav);
    window.addEventListener('popstate', onNav);
    window.addEventListener('hashchange', onNav);
    const vis = () => { if (document.visibilityState === 'visible') sendPresence(); };
    document.addEventListener('visibilitychange', vis);
    return () => {
      unpatch && unpatch();
      window.removeEventListener('popstate', onNav);
      window.removeEventListener('hashchange', onNav);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [effectiveToken]);

  /* ======================== онлайн-пинг ========================= */
  useEffect(() => {
    if (!effectiveToken) return;
    const ping = () => sendPresence();
    ping();
    const interval = setInterval(ping, 25000);
    return () => clearInterval(interval);
  }, [effectiveToken]);

  useEffect(() => {
    if (!effectiveToken) return;
    const handleBeforeUnload = () => {
      const meta = getPageMeta();
      fetch(`${apiUrl}/api/chat/offline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${effectiveToken}` },
        body: JSON.stringify(meta),
      }).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [effectiveToken]);

  /* ======================== загрузка сообщений =================== */
  const fetchMessages = async () => {
    if (!effectiveToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/chat/my`, {
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });
      if (res.status === 401) {
        if (effectiveToken === chatToken) {
          localStorage.removeItem('chatToken');
          setChatToken(null);
        }
        setMessages([]);
        return;
      }
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {/* noop */}
  };
  useEffect(() => { fetchMessages(); }, [effectiveToken]);
  useEffect(() => {
    if (!effectiveToken) return;
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [effectiveToken]);

  useEffect(() => {
    if (shouldScrollToBottom.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => messagesEndRef.current.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, []);

  /* ======================== статусы "печатает" =================== */
  useEffect(() => {
    if (!effectiveToken || !userId) return;
    let interval;
    const fetchTyping = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/chat/typing/statuses`, {
          headers: { Authorization: `Bearer ${effectiveToken}` }
        });
        if (res.status === 401) return;
        const map = await res.json();
        if (map && map[userId] && map[userId].fromAdmin && map[userId].isTyping) {
          setAdminTyping(true);
        } else {
          setAdminTyping(false);
        }
      } catch {/* noop */}
    };
    fetchTyping();
    interval = setInterval(fetchTyping, 1200);
    return () => clearInterval(interval);
  }, [effectiveToken, userId]);

  /* ======================== регистрация в чате =================== */
  const handleRegister = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('Введите имя и телефон!');
      setTimeout(() => setError(''), 2000);
      return;
    }
    try {
      const meta = getPageMeta();
      const res = await fetch(`${apiUrl}/api/chat/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, ...meta }),
      });
      const data = await res.json();
      if (res.status === 409 && data?.code === 'ALREADY_REGISTERED') {
        setInfo('Этот телефон уже зарегистрирован. Пожалуйста, войдите в кабинет.');
        return;
      }
      if (!res.ok) throw new Error(data?.error || 'Ошибка регистрации');
      localStorage.setItem('chatToken', data.token);
      setChatToken(data.token);
      setInfo('');
    } catch (err) {
      setError('Ошибка регистрации');
      setTimeout(() => setError(''), 2000);
    }
  };

  /* ======================== input/typing ========================= */
  function handleInput(e) {
    setMessage(e.target.value);
    if (!effectiveToken || !userId || !userName) return;
    const meta = getPageMeta();
    fetch(`${apiUrl}/api/chat/typing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveToken}`,
      },
      body: JSON.stringify({
        userId,
        isTyping: !!e.target.value,
        name: userName,
        fromAdmin: false,
        ...meta,
      }),
    }).catch(() => {});
  }

  /* ======================== отправка сообщения =================== */
  const handleSend = async () => {
    if (!effectiveToken) return;
    if (!message.trim() && images.length === 0 && audioChunks.length === 0) return;

    const formData = new FormData();
    if (message.trim()) formData.append('text', message.trim());
    images.forEach((img) => formData.append('images', img));
    if (audioChunks.length > 0) {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      formData.append('audio', audioBlob, 'voice.webm');
    }
    // >>> добавляем страницу
    const meta = getPageMeta();
    formData.append('pageUrl', meta.pageUrl);
    formData.append('pageHref', meta.pageHref);
    if (meta.referrer) formData.append('referrer', meta.referrer);
    if (meta.title) formData.append('title', meta.title);

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${effectiveToken}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Ошибка отправки сообщения');

      setMessage('');
      setImages([]);
      setAudioChunks([]);
      setShowEmoji(false);
      await fetchMessages();
      sendPresence(); // обновим lastPageUrl сразу после отправки
    } catch {
      setError('Ошибка отправки сообщения');
      setTimeout(() => setError(''), 2000);
    }

    // сбросить тайпинг
    if (effectiveToken && userId && userName) {
      const meta2 = getPageMeta();
      fetch(`${apiUrl}/api/chat/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({ userId, isTyping: false, name: userName, fromAdmin: false, ...meta2 }),
      }).catch(() => {});
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 3) {
      setError('Максимум 3 изображения');
      setTimeout(() => setError(''), 2000);
      return;
    }
    setImages([...images, ...files]);
  };

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
  };

  /* ======================== render =============================== */
  const payload = effectiveToken ? safeParseJwt(effectiveToken) : null;
  const greetingName = payload?.name || name || 'друг';

  return (
    <div
      className="chat-overlay"
      style={{
        "--chat-main-color": chatColor,
        "--chat-main-gradient": chatGradient,
        "--chat-main-shadow": shadowColor,
        "--chat-main-shadow2": shadowColor2,
      }}
    >
      <div className="chat-window">
        <div className="chat-header" style={{ background: chatColor }}>
          <div className="chat-header-info">
            <img src="/images/iconAdmin.png" alt="Admin" className="chat-admin-avatar" />
          </div>
          <div className="chat-status online">Данило • Онлайн</div>
          <button className="chat-close" onClick={onClose}>×</button>
        </div>

        {!effectiveToken ? (
          <div style={{ padding: 16 }}>
            <p>
              {chatSettings?.greeting?.trim()
                ? chatSettings.greeting
                : "Добро пожаловать в чат."}
            </p>

            <input
              type="text"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="tel"
              placeholder="Телефон"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              className="chat-start-button"
              style={{ background: chatColor }}
              onClick={handleRegister}
            >
              Начать
            </button>

            {info && (
              <div className="chat-info" style={{ marginTop: 10 }}>
                {info} <a href="/login" style={{ color: chatColor, fontWeight: 600 }}>Войти</a>
              </div>
            )}
            {error && <div className="chat-error">{error}</div>}
          </div>
        ) : (
          <>
            <div className="chat-messages" onScroll={handleScroll}>
              {/* авто-привет */}
              <div className="chat-message admin">
                <div className="chat-bubble">
                  <div style={{ fontSize: 13, marginBottom: 2, color: '#888', fontWeight: 500 }}>
                    Admin
                  </div>
                  <div>{`Здравствуйте, ${greetingName}! Чем можем помочь?`}</div>
                </div>
                <div className="chat-time">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {messages.length === 0 ? (
                <p className="no-messages">Нет сообщений</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`chat-message ${msg.fromAdmin ? 'admin' : 'you'}`}
                  >
                    <div className="chat-bubble">
                      <div style={{ fontSize: 13, marginBottom: 2, color: '#888', fontWeight: 500 }}>
                        {msg.fromAdmin ? 'Данило' : 'Вы'}
                      </div>
                      {msg.text && <div>{msg.text}</div>}
                      {msg.imageUrls?.length > 0 && msg.imageUrls.map((url, i) => (
                        <div className="chat-image-wrapper" key={i}>
                          <img src={`${apiUrl}${url}`} alt="attachment" className="chat-image" />
                        </div>
                      ))}
                      {msg.audioUrl && <VoiceMessage url={`${apiUrl}${msg.audioUrl}`} />}
                    </div>
                    <div className="chat-time">
                      {msg.createdAt &&
                        new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    </div>
                  </div>
                ))
              )}

              {adminTyping && (
                <div
                  style={{
                    display: 'inline-block',
                    background: '#eaf4ff',
                    borderRadius: 14,
                    padding: '6px 18px',
                    margin: '8px 0 8px 4px',
                    color: chatColor,
                    fontWeight: 500,
                    fontSize: 15,
                    boxShadow: '0 1px 6px #189eff12',
                    maxWidth: 220,
                  }}
                >
                  Менеджер печатает
                  <TypingAnimation />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input">
              <div className="chat-input-top">
                <input
                  type="text"
                  className="chat-text-input"
                  placeholder="Напишите свое сообщение..."
                  value={message}
                  onChange={handleInput}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button className="chat-send-button" onClick={handleSend}>➤</button>
              </div>

              {images.length > 0 && (
                <div className="chat-images-preview">
                  {images.map((img, idx) => (
                    <div key={idx} className="chat-preview-wrapper">
                      <img src={URL.createObjectURL(img)} alt={`preview-${idx}`} className="chat-preview-image" />
                    </div>
                  ))}
                </div>
              )}

              {error && <div className="chat-error">{error}</div>}

              <div className="chat-input-icons">
                <span className="chat-icon" title="Эмодзи" onClick={() => setShowEmoji(!showEmoji)}>😊</span>
                <label className="chat-icon" title="Прикрепить файл">
                  📎
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="chat-file"
                  />
                </label>
                <span
                  className={`chat-icon ${isRecording ? 'recording' : ''}`}
                  title={isRecording ? 'Остановить запись' : 'Начать запись'}
                  onClick={isRecording ? stopRecording : startRecording}
                >🎤</span>
              </div>

              {showEmoji && (
                <div className="emoji-picker-wrapper">
                  <EmojiPicker
                    theme="light"
                    onEmojiClick={handleEmojiClick}
                    height={300}
                    width={280}
                    searchDisabled={true}
                    previewConfig={{ showPreview: false }}
                    skinTonesDisabled={true}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
