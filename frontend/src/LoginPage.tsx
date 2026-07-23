import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_URL } from './api';
import './login.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
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

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { username, recoveryKey, newPassword });
      setForgotMsg(res.data.message || 'Khôi phục thành công!');
      setTimeout(() => setShowForgot(false), 2000);
    } catch (err: any) {
      setForgotMsg(err.response?.data?.error || 'Khôi phục thất bại');
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
        <h1 className="login-title">Hệ thống âm thanh tự động</h1>
        <p className="login-subtitle">AAS — Automation Audio System<br /><span>by minhhan.net</span></p>

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
          <div className="login-field" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <label htmlFor="remember" style={{ margin: 0, fontWeight: 'normal', cursor: 'pointer' }}>Ghi nhớ tôi</label>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); setShowForgot(true); }} style={{ fontSize: '0.9rem', color: 'var(--accent)', textDecoration: 'none' }}>Quên mật khẩu?</a>
          </div>
          {error && <div className="login-error">{React.createElement('ion-icon', { name: 'warning' })} {error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>

      {showForgot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="login-card" style={{ maxWidth: 400, margin: '0 20px', padding: '2rem' }}>
            <h3 style={{ marginTop: 0, color: '#f0f9ff', fontSize: '1.4rem', marginBottom: 10 }}>Khôi phục mật khẩu</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
              Vui lòng nhập tên đăng nhập, Mã khôi phục (Recovery Key) và mật khẩu mới.
            </p>
            <form onSubmit={handleForgotSubmit} className="login-form">
              <div className="login-field">
                <label>Tên đăng nhập</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="admin" />
              </div>
              <div className="login-field">
                <label>Mã khôi phục (Recovery Key)</label>
                <input type="text" value={recoveryKey} onChange={e => setRecoveryKey(e.target.value)} required style={{ fontFamily: 'monospace' }} placeholder="AAS-RECOVERY-..." />
              </div>
              <div className="login-field">
                <label>Mật khẩu mới</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Nhập mật khẩu mới" />
              </div>
              
              {forgotMsg && <div style={{ fontSize: 13, color: forgotMsg.includes('thành công') ? '#10b981' : '#fca5a5', padding: '8px 12px', background: forgotMsg.includes('thành công') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 8, textAlign: 'left' }}>{forgotMsg}</div>}
              
              <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, textAlign: 'left', lineHeight: 1.5 }}>
                Nếu mất cả Recovery Key, vui lòng liên hệ minhhan.net (0868911747) để yêu cầu reset hệ thống (mất toàn bộ dữ liệu).
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" className="login-btn" onClick={() => setShowForgot(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>Hủy</button>
                <button type="submit" className="login-btn" disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
