import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from './api';
import './login.css';

export default function SetupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/api/setup/init`, { username, password });
      if (res.data.success && res.data.recoveryKey) {
        setRecoveryKey(res.data.recoveryKey);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Lỗi cài đặt hệ thống.');
    }
  };

  if (recoveryKey) {
    return (
      <div className="login-root">
        <div className="login-bg" />
        <div className="login-card" style={{ maxWidth: 500 }}>
          <h2 style={{ color: '#10b981', textAlign: 'center', marginBottom: 20 }}>
            {React.createElement('ion-icon', { name: "checkmark-circle-outline", style: { fontSize: 32, verticalAlign: 'middle', marginRight: 8 } })}
            Cài đặt thành công!
          </h2>
          <p style={{ color: '#f0f9ff', marginBottom: 20 }}>Tài khoản Quản trị viên (Admin) đầu tiên đã được tạo.</p>
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: 15, borderRadius: 12, marginBottom: 20, textAlign: 'left', fontSize: '0.9rem' }}>
            <strong>⚠️ QUAN TRỌNG:</strong> Đây là <b>Mã Khôi Phục (Recovery Key)</b> của bạn. Nó chỉ hiển thị MỘT LẦN DUY NHẤT. Hãy copy và lưu giữ ở nơi an toàn. Bạn sẽ cần nó để lấy lại mật khẩu nếu quên.
          </div>
          <div style={{ 
            background: 'rgba(255,255,255,0.06)', padding: 15, borderRadius: 12, 
            fontFamily: 'monospace', fontSize: 20, textAlign: 'center', letterSpacing: 2,
            border: '1px dashed rgba(255,255,255,0.2)', marginBottom: 25, color: '#60a5fa'
          }}>
            {recoveryKey}
          </div>
          <button 
            className="login-btn"
            onClick={() => window.location.href = '/login'}
            style={{ width: '100%' }}
          >
            Đã lưu Mã Khôi phục - Đến trang Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-root">
      <div className="login-bg" />
      <div className="login-card">
        <h2 className="login-title" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          {React.createElement('ion-icon', { name: "settings-outline", style: { verticalAlign: 'middle', marginRight: 8 } })}
          Cài đặt Lần đầu
        </h2>
        <p className="login-subtitle">
          Chào mừng bạn đến với Hệ thống âm thanh tự động.<br/>Vui lòng tạo tài khoản Quản trị viên.
        </p>
        
        <form className="login-form" onSubmit={handleSetup}>
          <div className="login-field">
            <label>Tên đăng nhập (Username)</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ví dụ: admin"
              required
            />
          </div>
          <div className="login-field">
            <label>Mật khẩu</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu an toàn..."
              required
            />
          </div>
          {error && <div className="login-error">{React.createElement('ion-icon', { name: 'warning' })} {error}</div>}
          <button type="submit" className="login-btn">
            Khởi tạo Hệ thống
          </button>
        </form>
      </div>
    </div>
  );
}
