 // ClientRoom.jsx
import { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

const C = {
  bg1: '#fff8f0', bg2: '#fff0e0',
  card: 'rgba(255, 252, 248, 0.88)',
  cardStrong: 'rgba(255, 250, 245, 0.96)',
  border: 'rgba(255, 107, 53, 0.18)',
  borderGold: 'rgba(255, 209, 102, 0.3)',
  accent: '#ff6b35',
  accentGold: '#ffd166',
  accentPink: '#ff4d8d',
  accentTeal: '#07776e',
  text: '#1a1a2e',
  muted: 'rgba(60, 40, 30, 0.5)',
  shadow: '0 24px 70px rgba(255, 107, 53, 0.10)',
};

const roomPageStyle = {
  minHeight: '100vh',
  color: C.text,
  fontFamily: "'Rajdhani', 'Noto Sans JP', system-ui, sans-serif",
  background: `
    radial-gradient(ellipse 55% 45% at 15% 55%, rgba(255,107,53,0.10) 0%, transparent 70%),
    radial-gradient(ellipse 45% 40% at 85% 25%, rgba(255,77,141,0.08) 0%, transparent 70%),
    radial-gradient(ellipse 30% 30% at 70% 80%, rgba(0,184,169,0.07) 0%, transparent 70%),
    linear-gradient(180deg, #fff8f0 0%, #fff0e0 45%, #fff5ee 100%)
  `,
  animation: 'roomSlideIn 0.45s ease both',
};

const card = (extra = {}) => ({
  background: C.card,
  backdropFilter: 'blur(18px)',
  border: `1.5px solid ${C.border}`,
  borderRadius: '20px',
  boxShadow: C.shadow,
  ...extra,
});

const primaryBtn = {
  padding: '13px 28px', borderRadius: '8px', border: 'none',
  cursor: 'pointer', fontFamily: "'Bebas Neue', sans-serif",
  fontSize: '18px', letterSpacing: '0.1em', color: '#fff',
  background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentPink} 100%)`,
  boxShadow: `0 12px 30px rgba(255,107,53,0.3)`,
  transition: 'transform 200ms, filter 200ms',
};

const secondaryBtn = {
  padding: '11px 24px', borderRadius: '8px',
  border: `1.5px solid ${C.border}`, cursor: 'pointer',
  fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', letterSpacing: '0.1em',
  color: C.accent, background: 'rgba(255,107,53,0.06)',
  transition: 'background 200ms, border-color 200ms',
};

export default function ClientRoom({ onBack }) {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);
  const [isHostPaused, setIsHostPaused] = useState(false);
  const [localVolume, setLocalVolume] = useState(1);
  const [streamReady, setStreamReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const mediaRef = useRef(null);
  const hostIdRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('https://various-communication-utils-organic.trycloudflare.com', { transports: ['websocket'] });
    socketRef.current.on('movie-paused', () => setIsHostPaused(true));
    socketRef.current.on('movie-played', () => setIsHostPaused(false));

    socketRef.current.on('webrtc-offer', async ({ offer, from }) => {
      hostIdRef.current = from;
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'turn:global.relay.metered.ca:80', username: 'edb73dc2124be5205d93f824', credential: '7iBXpb0dzl8dmrv8' },
          { urls: 'turn:global.relay.metered.ca:443', username: 'edb73dc2124be5205d93f824', credential: '7iBXpb0dzl8dmrv8' }
        ]
      });
      peerRef.current = peer;
      peer.ontrack = (event) => {
        if (event.receiver && 'playoutDelayHint' in event.receiver) event.receiver.playoutDelayHint = 0;
        if (mediaRef.current) {
          if (!mediaRef.current.srcObject) mediaRef.current.srcObject = new MediaStream();
          mediaRef.current.srcObject.addTrack(event.track);
          setStreamReady(true);
        }
      };
      peer.onicecandidate = (event) => {
        if (event.candidate) socketRef.current.emit('ice-candidate', { candidate: event.candidate, to: from });
      };
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socketRef.current.emit('webrtc-answer', { answer, to: from });
    });
    socketRef.current.on('ice-candidate', async ({ candidate }) => {
      if (peerRef.current) await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    });
    return () => {
      socketRef.current.disconnect();
      if (peerRef.current) peerRef.current.close();
    };
  }, []);

  const handleJoin = () => {
    if (roomIdInput.trim().length > 0) {
      // Hardcoded wantsVideo to false to ensure audio-only mode
      socketRef.current.emit('join-room', { roomId: roomIdInput.toUpperCase(), wantsVideo: false });
      setIsJoined(true);
    }
  };

  const startMedia = () => {
    if (mediaRef.current) {
      mediaRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Play failed:', err));
    }
  };

  if (isBlackout) {
    return (
      <div onClick={() => setIsBlackout(false)} style={{
        backgroundColor: '#000', height: '100vh', width: '100vw',
        position: 'fixed', top: 0, left: 0, zIndex: 9999,
        display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
      }}>
        <p style={{ color: '#333', userSelect: 'none', fontFamily: "'Rajdhani', sans-serif" }}>Tap to wake screen</p>
      </div>
    );
  }

  return (
    <div style={roomPageStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Bebas+Neue&display=swap');
        @keyframes roomSlideIn {
          from { opacity: 0; transform: translateY(30px); filter: blur(6px); }
          to   { opacity: 1; transform: none; filter: none; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,107,53,0.4); } 50% { box-shadow: 0 0 0 8px rgba(255,107,53,0); } }
        .client-primary:hover { transform: translateY(-3px); filter: brightness(1.08); }
        .client-secondary:hover { background: rgba(255,107,53,0.10) !important; border-color: #ff6b35 !important; }
        .room-input:focus { outline: none; border-color: #ff6b35 !important; box-shadow: 0 0 0 3px rgba(255,107,53,0.12); }
      `}</style>

      {/* ── Navbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px', borderBottom: `2px solid rgba(255,107,53,0.12)`,
        background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(14px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: '0.12em', color: C.text }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'conic-gradient(#ff6b35, #ffd166, #ff4d8d, #00b8a9, #ff6b35)', display: 'inline-block', boxShadow: '0 0 10px rgba(255,107,53,0.5)' }} />
          SONIC FLOW
        </div>
        <button className="client-secondary" onClick={onBack} style={secondaryBtn}>← Exit</button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 22px 48px' }}>
        
        {/* ── Header card ── */}
        <div style={{ ...card({ padding: '22px 28px', textAlign: 'center', marginBottom: 24 }) }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
            borderRadius: '999px', background: 'rgba(255,77,141,0.08)', border: `1.5px solid rgba(255,77,141,0.22)`,
            color: C.accentPink, fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', marginBottom: 14,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.accentPink, display: 'inline-block', animation: 'pulse 2s infinite' }} />
            VIEWER ROOM
          </div>
          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '0.08em', lineHeight: 1,
            background: `linear-gradient(135deg, ${C.text} 0%, ${C.accent} 40%, ${C.accentPink} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '0 0 8px',
          }}>
            Join Cinema
          </h2>
          <p style={{ margin: 0, color: C.muted, fontSize: '1rem' }}>
            Enter the room code, grab your earphones, and sync with the host.
          </p>
        </div>

        {/* ── Invisible Audio element replaces the old Video element ── */}
        <audio ref={mediaRef} playsInline style={{ display: 'none' }} />

        {!isJoined ? (
          /* ── Join form ── */
          <div style={{ ...card({ padding: '28px 24px', maxWidth: 520, margin: '0 auto' }), display: 'grid', gap: 18, justifyItems: 'center' }}>
            <input
              className="room-input"
              type="text"
              placeholder="ENTER ROOM CODE"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              style={{
                width: '100%', maxWidth: 280,
                padding: '14px 18px', fontSize: '1.2rem',
                borderRadius: 12, border: `1.5px solid rgba(255,107,53,0.2)`,
                background: 'rgba(255,248,240,0.9)', color: C.text,
                textTransform: 'uppercase', textAlign: 'center',
                letterSpacing: '5px', fontFamily: "'Bebas Neue', sans-serif",
                transition: 'border-color 200ms',
              }}
            />

            {/* Static Streaming Mode Badge */}
            <div style={{ width: '100%', borderRadius: 14, padding: '16px', background: 'rgba(255,107,53,0.04)', border: `1.5px solid rgba(255,107,53,0.12)` }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: C.muted, fontWeight: 700, letterSpacing: '0.2em', textAlign: 'center' }}>
                STREAMING MODE
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <div style={{
                  padding: '10px 18px', borderRadius: 8,
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: '0.08em',
                  border: `1.5px solid ${C.accent}`,
                  background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentPink} 100%)`,
                  color: '#fff',
                  cursor: 'default',
                }}>
                  🎧 AUDIO CHANNEL (DEFAULT)
                </div>
              </div>
            </div>

            <button className="client-primary" onClick={handleJoin} style={{ ...primaryBtn, width: '100%', maxWidth: 260, padding: '15px 24px', fontSize: 20 }}>
              CONNECT →
            </button>
          </div>
        ) : (
          /* ── Connected view ── */
          <div style={{ ...card({ padding: '24px', maxWidth: 720, margin: '0 auto' }) }}>
            <h3 style={{
              fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.14em',
              fontSize: 18, color: C.accent, marginTop: 0, marginBottom: 18,
            }}>
              ● SECURE AUDIO FEED
            </h3>

            {!streamReady ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: C.muted }}>
                <div style={{
                  display: 'inline-block', width: 42, height: 42,
                  border: '3px solid rgba(255,107,53,0.12)',
                  borderTop: `3px solid ${C.accent}`,
                  borderRadius: '50%', animation: 'spin 1s linear infinite',
                }} />
                <p style={{ marginTop: 16, fontSize: 15 }}>Waiting for host to play movie…</p>
              </div>
            ) : !isPlaying ? (
              <div style={{ textAlign: 'center' }}>
                <button className="client-primary" onClick={startMedia} style={{ ...primaryBtn, width: '100%', maxWidth: 340, padding: '16px 24px', fontSize: 20 }}>
                  ▶ TAP TO SYNC AUDIO
                </button>
              </div>
            ) : (
              <div>
                {isHostPaused && (
                  <div style={{
                    padding: '13px 16px', marginBottom: 20,
                    background: 'rgba(255,209,102,0.10)', border: `1.5px solid rgba(255,209,102,0.35)`,
                    borderRadius: 12, color: '#c47d00', fontWeight: 700, fontSize: 15,
                  }}>
                    ⏸ Host Paused Stream
                  </div>
                )}

                {/* Volume */}
                <div style={{ background: 'rgba(255,107,53,0.04)', padding: 18, borderRadius: 14, border: `1.5px solid rgba(255,107,53,0.12)` }}>
                  <p style={{ margin: '0 0 12px', fontSize: 12, color: C.muted, fontWeight: 700, letterSpacing: '0.2em' }}>
                    VOLUME: {Math.round(localVolume * 100)}%
                  </p>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={localVolume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setLocalVolume(v);
                      if (mediaRef.current) mediaRef.current.volume = v;
                    }}
                    style={{ width: '100%', cursor: 'pointer', accentColor: C.accent }}
                  />
                </div>

                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <button className="client-secondary" onClick={() => setIsBlackout(true)} style={secondaryBtn}>
                    🌙 DIM SCREEN (SAVE BATTERY)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}