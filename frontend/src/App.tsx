
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PlayerPage from './PlayerPage';
import LoginPage from './LoginPage';
import AdminPage from './AdminPage';
import SetupPage from './SetupPage';
import { API_URL } from './api';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function SetupCheck({ children }: { children: React.ReactNode }) {
  const [isSetup, setIsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/setup/status`)
      .then(res => res.json())
      .then(data => setIsSetup(data.isSetup))
      .catch(() => setIsSetup(true)); // Fallback if error
  }, []);

  if (isSetup === null) return <div style={{textAlign: 'center', marginTop: '20vh'}}>Đang tải...</div>;
  if (!isSetup) return <Navigate to="/setup" replace />;
  
  return children;
}

export default function App() {
  useEffect(() => {
    fetch(`${API_URL}/api/files/assets/info`)
      .then(r => r.json())
      .then(data => {
        if (data.favicon) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = `${API_URL}${data.favicon}`;
        }
      })
      .catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/" element={<SetupCheck><PrivateRoute><AdminPage /></PrivateRoute></SetupCheck>} />
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="/player" element={<SetupCheck><PlayerPage /></SetupCheck>} />
        <Route path="/login" element={<SetupCheck><LoginPage /></SetupCheck>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
