import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminCreateGroupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const response = await fetch('/api/groups');
        const data = await response.json();
        setGroups(data);
      } catch (error) {
        setGroups([]);
      }
    }
    fetchGroups();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    if (file) reader.readAsDataURL(file);
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('name', name);
    if (parentId) formData.append('parentId', parentId);
    formData.append('description', description);
    if (image) formData.append('img', image);

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        body: formData,
      });
      const newGroup = await response.json();
      setLoading(false);
      if (newGroup._id) {
        navigate('/admin/groups');
      } else {
        alert(newGroup.message || 'Ошибка сохранения группы');
      }
    } catch {
      setLoading(false);
      alert('Ошибка при сохранении группы');
    }
  };

  const ROOT_GROUP = groups.find(g => g.name === 'Родительская группа' && !g.parentId);
  const availableParents = groups.filter(
    g => g._id !== (ROOT_GROUP && ROOT_GROUP._id)
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f6fafd',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '44px 0 60px 0'
    }}>
      <div style={{
        position: "absolute",
        left: 60,
        top: 38,
        zIndex: 10
      }}>
        <button
          type="button"
          onClick={() => navigate('/admin/groups')}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: "#eaf4ff",
            color: "#2291ff",
            border: "none",
            fontWeight: 400,
            fontSize: 18,
            borderRadius: 11,
            padding: "10px 20px 10px 14px",
            boxShadow: "0 2px 12px #2291ff11",
            cursor: "pointer",
            transition: "background 0.17s",
            gap: 8,
          }}
        >
          <svg height="22" width="22" viewBox="0 0 24 24" style={{ marginRight: 4 }}>
            <path fill="#2291ff" d="M15.5 19.09 9.41 13l6.09-6.09L14.08 5.5 6.59 13l7.49 7.5z" />
          </svg>
          Назад
        </button>
      </div>
      <form
        onSubmit={handleSaveGroup}
        style={{
          background: '#fff',
          borderRadius: 24,
          maxWidth: 900,
          width: '100%',
          boxShadow: '0 8px 32px #2291ff12',
          display: 'flex',
          flexDirection: 'row',
          gap: 0,
          overflow: 'hidden',
          marginTop: 34
        }}
      >
        {/* Левая часть */}
        <div style={{
          flex: 2,
          padding: '40px 38px 38px 38px',
          borderRight: '1.5px solid #eaf1fa',
          display: 'flex',
          flexDirection: 'column',
          gap: 30
        }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 500,
            marginBottom: 16,
            color: '#1b2437',
            letterSpacing: 0.1
          }}>Добавить группу</h1>
          <div>
            <label style={{
              fontWeight: 400,
              color: '#1b2437',
              fontSize: 17,
              marginBottom: 7,
              display: "block"
            }}>Название группы</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Введите название группы"
              style={{
                width: '100%',
                marginTop: 7,
                padding: '13px 16px',
                borderRadius: 11,
                border: '1.5px solid #c9e4ff',
                fontSize: 16,
                fontWeight: 400,
                background: '#f6fafd'
              }}
              required
              autoFocus
            />
          </div>
          <div>
            <label style={{
              fontWeight: 400,
              color: '#1b2437',
              fontSize: 17,
              marginBottom: 7,
              display: "block"
            }}>
              Родительская группа
              <span style={{
                color: '#b1bacf',
                marginLeft: 6,
                fontWeight: 400,
                fontSize: 13
              }}>
                (группа верхнего уровня)
              </span>
            </label>
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              style={{
                width: '100%',
                marginTop: 7,
                padding: '12px 16px',
                borderRadius: 11,
                border: '1.5px solid #c9e4ff',
                fontSize: 16,
                fontWeight: 400,
                background: '#f6fafd'
              }}
            >
              <option value={ROOT_GROUP?._id || ''}>
                Родительская группа (группа верхнего уровня)
              </option>
              {availableParents.map(group =>
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              )}
            </select>
          </div>
          <div>
            <label style={{
              fontWeight: 400,
              color: '#1b2437',
              fontSize: 17,
              marginBottom: 7,
              display: "block"
            }}>Описание группы</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Введите описание группы"
              style={{
                width: '100%',
                marginTop: 7,
                padding: '13px 16px',
                borderRadius: 11,
                border: '1.5px solid #c9e4ff',
                fontSize: 15,
                fontWeight: 400,
                minHeight: 120,
                resize: 'vertical',
                background: '#f6fafd'
              }}
            />
          </div>
        </div>
        {/* Правая часть — Блок фото и кнопка */}
        <div style={{
          flex: 1.25,
          padding: '40px 34px 38px 34px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start'
        }}>
          <div>
            <label style={{
              fontWeight: 400,
              color: '#1b2437',
              fontSize: 17,
              marginBottom: 7,
              display: "block"
            }}>Изображение группы</label>
            <div style={{
              margin: '15px 0 18px 0',
              border: '1.5px dashed #b6d4fc',
              borderRadius: 14,
              padding: '22px 10px',
              background: '#f8fbff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{
                  marginBottom: '10px'
                }}
              />
              {preview ? (
                <img src={preview} alt="Preview"
                  style={{
                    width: '100%', maxWidth: 190, borderRadius: 13,
                    boxShadow: '0 2px 10px #2291ff19', marginTop: 6
                  }} />
              ) : (
                <div style={{
                  color: '#b8b8c3',
                  fontSize: 16,
                  marginTop: 8,
                  textAlign: 'center'
                }}>
                  Рекомендованный размер 200x200 пикселей<br />
                  JPG, PNG, WEBP. Макс. размер: 10MB.
                </div>
              )}
            </div>
          </div>
          <button
            type="submit"
            style={{
              background: loading ? '#98ccfd' : '#2291ff',
              color: '#fff',
              padding: '15px 0',
              borderRadius: 13,
              border: 'none',
              fontSize: 18,
              fontWeight: 400,
              width: '100%',
              marginTop: 22,
              boxShadow: '0 4px 14px #2291ff19',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.16s'
            }}
            disabled={loading}
          >
            {loading ? 'Сохраняем...' : 'Сохранить группу'}
          </button>
        </div>
      </form>
    </div>
  );
}
