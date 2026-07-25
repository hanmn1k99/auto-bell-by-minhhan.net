import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

export default function LiveStreamPage() {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedInputId, setSelectedInputId] = useState<string>('default');
  const [targetChannel, setTargetChannel] = useState<string>('all');
  const [streamTitle, setStreamTitle] = useState<string>('Phát âm thanh Trực tiếp (Piano / Line-In)');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [highFidelity, setHighFidelity] = useState<boolean>(true);
  const [inputVolume, setInputVolume] = useState<number>(1.0);
  const [vuLevel, setVuLevel] = useState<number>(0);
  const [spectrumBars, setSpectrumBars] = useState<number[]>(new Array(16).fill(0));

  const socketRef = useRef<Socket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = 'Phát âm thanh Trực tiếp | AAS';
    
    // Connect Socket
    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    // Scan audio input devices
    scanInputDevices();

    return () => {
      stopStreaming();
      if (socket) socket.disconnect();
    };
  }, []);

  const scanInputDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // xin quyền truy cập micro 1 lần để đọc nhãn tên thiết bị
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        if (tempStream) {
          tempStream.getTracks().forEach(t => t.stop());
        }
      }
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(d => d.kind === 'audioinput');
        setAudioInputs(inputs);
        if (inputs.length > 0 && !selectedInputId) {
          setSelectedInputId(inputs[0].deviceId || 'default');
        }
      }
    } catch (err) {
      console.error('Error scanning audio input devices:', err);
    }
  };

  const startStreaming = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedInputId ? { exact: selectedInputId } : undefined,
          echoCancellation: !highFidelity,
          noiseSuppression: !highFidelity,
          autoGainControl: !highFidelity,
          channelCount: 2, // Stereo
          sampleRate: 48000
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      // Web Audio API visualizer & Gain node
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = inputVolume;
      gainNodeRef.current = gainNode;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      source.connect(gainNode);
      gainNode.connect(analyser);

      // Loop VU Meter & Frequency Spectrum
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVisualizer = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        const bars: number[] = [];
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i] || 0;
          bars.push(Math.round((val / 255) * 100));
          sum += val;
        }
        const avg = Math.round((sum / (dataArray.length * 255)) * 100);
        setVuLevel(avg);
        setSpectrumBars(bars);
        animFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

      // Setup MediaRecorder to băm nhỏ audio chunks 100ms
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else mimeType = '';
      }

      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && socketRef.current) {
          event.data.arrayBuffer().then((buffer) => {
            socketRef.current?.emit('LIVE_STREAM_CHUNK', buffer);
          });
        }
      };

      // Notify Socket Start Live Stream
      socketRef.current?.emit('START_LIVE_STREAM', {
        soundCardId: targetChannel,
        title: streamTitle,
        mimeType
      });

      recorder.start(100); // Send chunk every 100ms
      setIsStreaming(true);

    } catch (err: any) {
      alert(`Không thể kết nối cổng âm thanh đầu vào: ${err.message || 'Lỗi thiết bị'}`);
      stopStreaming();
    }
  };

  const stopStreaming = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    gainNodeRef.current = null;

    if (socketRef.current && isStreaming) {
      socketRef.current.emit('STOP_LIVE_STREAM');
    }

    setIsStreaming(false);
    setVuLevel(0);
    setSpectrumBars(new Array(16).fill(0));
  };

  const handleVolumeChange = (v: number) => {
    setInputVolume(v);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = v;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#030712',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '2rem 1.5rem'
    }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '1.4rem', boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
              }}>
                {React.createElement('ion-icon', { name: 'radio-outline' })}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
                  Phát âm thanh Trực tiếp (`/input`)
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  Truyền trực tiếp từ đàn Piano / Line-In / Micro sang tất cả các loa trường
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                {React.createElement('ion-icon', { name: 'grid-outline' })} Dashboard
              </button>
            </a>
            <a href="/player" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                {React.createElement('ion-icon', { name: 'play-circle-outline' })} Xem Player
              </button>
            </a>
          </div>
        </div>

        {/* Live Stream Panel Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: isStreaming ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '2rem',
          boxShadow: isStreaming ? '0 0 30px rgba(239,68,68,0.15)' : 'none',
          transition: 'all 0.3s ease'
        }}>
          {/* Status Badge Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{
                width: '12px', height: '12px', borderRadius: '50%',
                backgroundColor: isStreaming ? '#ef4444' : '#475569',
                boxShadow: isStreaming ? '0 0 12px #ef4444' : 'none',
                animation: isStreaming ? 'pulse 1.5s infinite ease-in-out' : 'none'
              }} />
              <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.5px', color: isStreaming ? '#ef4444' : '#94a3b8' }}>
                {isStreaming ? '🔴 ĐANG PHÁT TRỰC TIẾP (LIVE BROADCASTING)' : '⚪ TRẠNG THÁI SẴN SÀNG'}
              </span>
            </div>

            <button
              onClick={scanInputDevices}
              className="btn btn-xs btn-outline"
              disabled={isStreaming}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
            >
              {React.createElement('ion-icon', { name: 'refresh-outline' })} Quét thiết bị vào
            </button>
          </div>

          {/* Form Settings Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            {/* Input Device Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#cbd5e1' }}>
                Cổng âm thanh đầu vào (Input Source)
              </label>
              <select
                className="input"
                value={selectedInputId}
                disabled={isStreaming}
                onChange={e => setSelectedInputId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                <option value="default">Cổng mặc định (Default System Input)</option>
                {audioInputs.map((input, idx) => (
                  <option key={input.deviceId || idx} value={input.deviceId}>
                    {input.label || `Cổng vào Audio #${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Output Channels */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#cbd5e1' }}>
                Kênh xuất âm thanh phụ trách (Target Channel)
              </label>
              <select
                className="input"
                value={targetChannel}
                disabled={isStreaming}
                onChange={e => setTargetChannel(e.target.value)}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                <option value="all">Tất cả kênh (Phát toàn bộ)</option>
                <option value="card-1">Kênh 1</option>
                <option value="card-2">Kênh 2</option>
                <option value="default">Mặc định hệ thống</option>
              </select>
            </div>
          </div>

          {/* Stream Title & Fidelity Settings */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#cbd5e1' }}>
              Tiêu đề thông báo / Sự kiện
            </label>
            <input
              type="text"
              className="input"
              value={streamTitle}
              disabled={isStreaming}
              onChange={e => setStreamTitle(e.target.value)}
              placeholder="Vd: Buổi hòa tấu Piano của thầy Âm nhạc"
              style={{ width: '100%', padding: '0.75rem' }}
            />
          </div>

          {/* Mode Switch: Piano High Fidelity vs Speech */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {React.createElement('ion-icon', { name: 'musical-notes-outline', style: { fontSize: '1.5rem', color: '#863bff' } })}
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                  Chế độ Âm nhạc Chân thực (High-Fidelity Studio Mode)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                  Tắt lọc nhiễu nén tiếng để giữ trọn âm ngân ấm & độ động sinh động của đàn Piano / Nhạc cụ.
                </div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={highFidelity}
              disabled={isStreaming}
              onChange={e => setHighFidelity(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
          </div>

          {/* Input Gain Volume Slider */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#cbd5e1' }}>
              <span>Âm lượng tín hiệu vào (Gain)</span>
              <span style={{ color: 'var(--accent)' }}>{Math.round(inputVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={inputVolume}
              onChange={e => handleVolumeChange(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
          </div>

          {/* Live Spectrum & VU Meter Monitor */}
          <div style={{ background: '#0b0f19', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>ĐỒNG HỒ TÍN HIỆU ÂM THANH ĐẦU VÀO (VU METER & SPECTRUM)</span>
              <span style={{ color: vuLevel > 80 ? '#ef4444' : vuLevel > 50 ? '#f59e0b' : '#10b981' }}>
                {vuLevel}%
              </span>
            </div>

            {/* Frequency Bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '70px', gap: '4px' }}>
              {spectrumBars.map((bar, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${Math.max(bar, 5)}%`,
                    backgroundColor: bar > 80 ? '#ef4444' : bar > 50 ? '#f59e0b' : '#863bff',
                    borderRadius: '3px',
                    transition: 'height 0.08s ease'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Action Control Button */}
          <div style={{ textAlign: 'center' }}>
            {!isStreaming ? (
              <button
                onClick={startStreaming}
                className="btn btn-primary"
                style={{
                  padding: '1rem 3rem',
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  borderRadius: '50px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  border: 'none',
                  color: '#fff'
                }}
              >
                {React.createElement('ion-icon', { name: 'radio-outline', style: { fontSize: '1.4rem' } })}
                BẮT ĐẦU PHÁT TRỰC TIẾP
              </button>
            ) : (
              <button
                onClick={stopStreaming}
                className="btn"
                style={{
                  padding: '1rem 3rem',
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  borderRadius: '50px',
                  background: '#334155',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                {React.createElement('ion-icon', { name: 'square-outline', style: { fontSize: '1.4rem' } })}
                DỪNG PHÁT SÓNG
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
