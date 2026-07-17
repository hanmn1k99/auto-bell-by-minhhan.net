import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_URL } from './api';
import './login.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  React.useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      navigate('/admin');
    }

    api.get('/api/files/assets/info')
      .then(res => {
        if (res.data.logo) setLogoUrl(`${API_URL}${res.data.logo}`);
      })
      .catch(() => {});
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { username, password, remember: rememberMe });
      if (rememberMe) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('rememberMe', 'true');
        sessionStorage.removeItem('token');
      } else {
        sessionStorage.setItem('token', res.data.token);
        localStorage.removeItem('token');
        localStorage.removeItem('rememberMe');
      }
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-bg" />
      <div className="login-card">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ width: '100%', maxWidth: '280px', maxHeight: '120px', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
        ) : (
          <div className="login-logo">{React.createElement('ion-icon', { name: 'notifications', style: {fontSize: '2.5rem', color: 'var(--accent)'} })}</div>
        )}
        <h1 className="login-title">AutoBells</h1>
        <p className="login-subtitle">Hệ thống âm thanh tự động<br /><span>by minhhan.net</span></p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              autoComplete="username"
              required
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="login-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <label htmlFor="remember" style={{ margin: 0, fontWeight: 'normal', cursor: 'pointer' }}>Ghi nhớ tôi</label>
          </div>
          {error && <div className="login-error">{React.createElement('ion-icon', { name: 'warning' })} {error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
