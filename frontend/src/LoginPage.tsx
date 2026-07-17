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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: 8, width: '100%', maxWidth: 400 }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Khôi phục mật khẩu</h3>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
              Chỉ dành cho Admin. Vui lòng nhập tên đăng nhập, Mã khôi phục (Recovery Key) và mật khẩu mới.
            </p>
            <form onSubmit={handleForgotSubmit}>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 5 }}>Tên đăng nhập</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 5 }}>Mã khôi phục (Recovery Key)</label>
                <input type="text" value={recoveryKey} onChange={e => setRecoveryKey(e.target.value)} required style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', fontFamily: 'monospace' }} />
              </div>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 5 }}>Mật khẩu mới</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }} />
              </div>
              {forgotMsg && <div style={{ fontSize: 13, color: forgotMsg.includes('thành công') ? 'green' : 'red', marginBottom: 10 }}>{forgotMsg}</div>}
              
              <div style={{ fontSize: 12, color: '#888', marginBottom: 20, fontStyle: 'italic', background: '#f9f9f9', padding: 10, borderRadius: 4 }}>
                Nếu bạn mất cả Recovery Key, vui lòng liên hệ minhhan.net (0868911747) để yêu cầu reset hệ thống (Lưu ý: Sẽ mất toàn bộ cấu hình, lịch phát và âm thanh).
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForgot(false)} style={{ padding: '8px 16px', background: '#eee', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
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
