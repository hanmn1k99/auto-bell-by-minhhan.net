import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from './api';

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
      <div style={{
        maxWidth: 500, margin: '50px auto', padding: '20px', 
        fontFamily: 'Inter, sans-serif', border: '1px solid #ddd', 
        borderRadius: 8, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#2ecc71', textAlign: 'center' }}>
          {React.createElement('ion-icon', { name: "checkmark-circle-outline", style: { fontSize: 32, verticalAlign: 'middle', marginRight: 8 } })}
          Cài đặt thành công!
        </h2>
        <p>Tài khoản Quản trị viên (Admin) đầu tiên đã được tạo.</p>
        <div style={{ background: '#f8d7da', color: '#721c24', padding: 15, borderRadius: 5, marginBottom: 20 }}>
          <strong>⚠️ QUAN TRỌNG:</strong> Đây là <b>Mã Khôi Phục (Recovery Key)</b> của bạn. Nó chỉ hiển thị MỘT LẦN DUY NHẤT. Hãy copy và lưu giữ ở nơi an toàn. Bạn sẽ cần nó để lấy lại mật khẩu nếu quên.
        </div>
        <div style={{ 
          background: '#f4f4f4', padding: 15, borderRadius: 5, 
          fontFamily: 'monospace', fontSize: 20, textAlign: 'center', letterSpacing: 2,
          border: '1px dashed #999', marginBottom: 20
        }}>
          {recoveryKey}
        </div>
        <button 
          onClick={() => window.location.href = '/login'}
          style={{ 
            width: '100%', padding: '12px', background: '#3498db', color: '#fff', 
            border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 16, fontWeight: 'bold'
          }}
        >
          Đã lưu Mã Khôi phục - Đến trang Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 400, margin: '50px auto', padding: '30px', 
      fontFamily: 'Inter, sans-serif', border: '1px solid #ddd', 
      borderRadius: 12, background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: 10, color: '#333' }}>
        {React.createElement('ion-icon', { name: "settings-outline", style: { verticalAlign: 'middle', marginRight: 8 } })}
        Cài đặt Lần đầu
      </h2>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: 25, fontSize: 14 }}>
        Chào mừng bạn đến với AutoBells.<br/>Vui lòng tạo tài khoản Quản trị viên (Admin) đầu tiên.
      </p>
      
      {error && <div style={{ color: '#d9534f', background: '#f2dede', padding: 10, borderRadius: 4, marginBottom: 15, fontSize: 14 }}>{error}</div>}
      
      <form onSubmit={handleSetup}>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#555' }}>Tên đăng nhập (Username)</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ví dụ: admin"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 25 }}>
          <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#555' }}>Mật khẩu</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu an toàn..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15, boxSizing: 'border-box' }}
          />
        </div>
        <button 
          type="submit"
          style={{ 
            width: '100%', padding: '12px', background: '#3498db', color: '#fff', 
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16, fontWeight: 600,
            transition: 'background 0.2s'
          }}
        >
          Khởi tạo Hệ thống
        </button>
      </form>
    </div>
  );
}
