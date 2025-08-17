import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useSite } from "../context/SiteContext";
import '../assets/ChatWindow.css';

const apiUrl = import.meta.env.VITE_API_URL || '';

// ====================== Вспомогательные функции цвета =========================
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

// ======================= Анимация "печатает..." ========================
function TypingAnimation() {
  const [dots, setDots] = useState("...");
  useEffect(() => {
    const arr = ["...", "..", ".", ""];
    let i = 0;
    const timer = setInterval(() => {
      setDots(arr[i % arr.length]);
      i++;
    }, 350);
    return () => clearInterval(timer);
  }, []);
  return <span style={{ marginLeft: 3 }}>{dots}</span>;
}

// ======================= Компонент голосового ==========================
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
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const bar = e.target.closest('.voice-bar2');
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const audio = audioRef.current;
    if (audio) audio.currentTime = percent * duration;
  };

  function formatTime(sec) {
    if (!isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

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
        {formatTime(current)}<span style={{ opacity: 0.7, fontWeight: 400 }}> / {formatTime(duration)}</span>
      </span>
    </div>
  );
};

// ========================= Основной компонент ========================
const ChatWindow = ({ onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('chatToken'));
  const [images, setImages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordTime, setRecordTime] = useState(0);
  const [error, setError] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);
  const mediaRecorder = useRef(null);
  const shouldScrollToBottom = useRef(true);
  const recordTimer = useRef(null);
  const chatWindowRef = useRef(null);

  // Цветовая тема из chatSettings
  const { chatSettings } = useSite();
  const chatColor = chatSettings?.color || "#2291ff";
  const chatGradient = `linear-gradient(135deg, ${chatColor}, ${lightenColor(chatColor, 30)})`;
  const shadowColor = hexToRgba(chatColor, 0.5);
  const shadowColor2 = hexToRgba(chatColor, 0);

  // Достаем userId и userName из токена
  let userId = null, userName = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.id;
      userName = payload.name;
    } catch (e) {
      // пусто
    }
  }

  // ======== ВСЕ твои useEffect и функции из прошлого кода ===========

  // Функция для начала записи
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

      recordTimer.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      setError('Не удалось начать запись');
      setTimeout(() => setError(''), 2000);
    }
  };

  // Функция для остановки записи
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

  // --- PING онлайн-статуса каждые 25 сек ---
  useEffect(() => {
    if (!token) return;
    const ping = () => {
      fetch(`${apiUrl}/api/chat/ping`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    };
    ping();
    const interval = setInterval(ping, 25000);
    return () => clearInterval(interval);
  }, [token]);

  // --- При закрытии вкладки — offline ---
  useEffect(() => {
    if (!token) return;
    const handleBeforeUnload = () => {
      fetch(`${apiUrl}/api/chat/offline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [token]);

  // Получение сообщений
  const fetchMessages = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/chat/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('chatToken');
        setToken(null);
        setMessages([]);
        return;
      }
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {}
  };

  useEffect(() => { fetchMessages(); }, [token]);
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [token]);

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

  // Получение статуса "печатает"
  useEffect(() => {
    if (!token || !userId) return;
    let interval;
    const fetchTyping = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/chat/typing/statuses`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) {
          localStorage.removeItem('chatToken');
          setToken(null);
          setAdminTyping(false);
          return;
        }
        const map = await res.json();
        if (map && map[userId] && map[userId].fromAdmin && map[userId].isTyping) {
          setAdminTyping(true);
        } else {
          setAdminTyping(false);
        }
      } catch {}
    };
    fetchTyping();
    interval = setInterval(fetchTyping, 1200);
    return () => clearInterval(interval);
  }, [token, userId]);

  // Авторизация клиента
  const handleStart = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('Введите имя и телефон!');
      setTimeout(() => setError(''), 2000);
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка авторизации');
      localStorage.setItem('chatToken', data.token);
      setToken(data.token);
    } catch (err) {
      setError('Ошибка входа в чат');
      setTimeout(() => setError(''), 2000);
    }
  };

  // === ОТПРАВКА СТАТУСА "ПЕЧАТАЕТ" ===
  function handleInput(e) {
    setMessage(e.target.value);
    if (!userId || !userName) return;
    fetch(`${apiUrl}/api/chat/typing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        isTyping: !!e.target.value,
        name: userName,
        fromAdmin: false
      }),
    });
  }

  // Отправка сообщения
  const handleSend = async () => {
    if (!message.trim() && images.length === 0 && audioChunks.length === 0) return;

    const formData = new FormData();
    formData.append('text', message);

    images.forEach((img) => formData.append('images', img));
    if (audioChunks.length > 0) {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      formData.append('audio', audioBlob);
    }

    if (!token) {
      formData.append('name', name);
      formData.append('phone', phone);
    }

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка отправки сообщения');
      setMessage('');
      setImages([]);
      setAudioChunks([]);
      setShowEmoji(false);
      fetchMessages();
      if (token) {
        fetch(`${apiUrl}/api/chat/ping`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      setError('Ошибка отправки сообщения');
      setTimeout(() => setError(''), 2000);
    }

    // Сбросить "печатает"
    if (userId && userName) {
      fetch(`${apiUrl}/api/chat/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          isTyping: false,
          name: userName,
          fromAdmin: false
        }),
      });
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

  // ============= РЕНДЕР ==============
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
      <div className="chat-window" ref={chatWindowRef}>
        <div className="chat-header" style={{ background: chatColor }}>
          <div className="chat-header-info">
            <img
              src="/images/iconAdmin.png"
              alt="Admin"
              className="chat-admin-avatar"
            />
          </div>
          <div className="chat-status online">Данило • Онлайн</div>
          <button className="chat-close" onClick={onClose}>×</button>
        </div>

        {!token ? (
          <div style={{ padding: 16 }}>
            <p>
              {chatSettings?.greeting?.trim()
                ? chatSettings.greeting
                : "Добро пожаловать в чат."
              }
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
            <button className="chat-start-button" style={{ background: chatColor }} onClick={handleStart}>Начать</button>
            {error && <div className="chat-error">{error}</div>}
          </div>
        ) : (
          <>
            <div className="chat-messages" onScroll={handleScroll}>
              {/* Автоответ после регистрации */}
              <div className="chat-message admin">
                <div className="chat-bubble">
                  <div style={{
                    fontSize: 13,
                    marginBottom: 2,
                    color: '#888',
                    fontWeight: 500
                  }}>
                    Admin
                  </div>
                  <div>{`Здравствуйте ${name}! Чем можем помочь?`}</div>
                </div>
                <div className="chat-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              {messages.length === 0
                ? <p className="no-messages">Нет сообщений</p>
                : messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`chat-message ${msg.fromAdmin ? 'admin' : 'you'}`}
                  >
                    <div className="chat-bubble">
                      <div style={{
                        fontSize: 13,
                        marginBottom: 2,
                        color: '#888',
                        fontWeight: 500
                      }}>
                        {msg.fromAdmin ? 'Данило' : 'Вы'}
                      </div>
                      {msg.text && <div>{msg.text}</div>}
                      {msg.imageUrls?.length > 0 && msg.imageUrls.map((url, i) => (
                        <div className="chat-image-wrapper" key={i}>
                          <img
                            src={`${apiUrl}${url}`}
                            alt="attachment"
                            className="chat-image"
                          />
                        </div>
                      ))}
                      {msg.audioUrl &&
                        <VoiceMessage url={`${apiUrl}${msg.audioUrl}`} />
                      }
                    </div>
                    <div className="chat-time">
                      {msg.createdAt &&
                        new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                    </div>
                  </div>
                ))}
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
                      <img
                        src={URL.createObjectURL(img)}
                        alt={`preview-${idx}`}
                        className="chat-preview-image"
                      />
                    </div>
                  ))}
                </div>
              )}
              {error && <div className="chat-error">{error}</div>}
              <div className="chat-input-icons">
                <span
                  className="chat-icon"
                  title="Эмодзи"
                  onClick={() => setShowEmoji(!showEmoji)}
                >😊</span>
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
