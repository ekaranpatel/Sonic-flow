 // HostRoom.jsx
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
  accentTeal: '#00b8a9',
  text: '#1a1a2e',
  muted: 'rgba(60, 40, 30, 0.5)',
  shadow: '0 24px 70px rgba(255, 107, 53, 0.10)',
};

// NEW: Defining the Aspect Ratio modes outside the component
const aspectModes = [
  { label: "Default", value: "auto" },
  { label: "16:9", value: "16/9" },
  { label: "4:3", value: "4/3" },
  { label: "16:10", value: "16/10" },
  { label: "5:4", value: "5/4" },
  { label: "1:1", value: "1/1" }
];

const roomPageStyle = {
  minHeight: '100vh',
  padding: '0',
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
  padding: '13px 28px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: '18px',
  letterSpacing: '0.1em',
  color: '#fff',
  background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentPink} 100%)`,
  boxShadow: `0 12px 30px rgba(255,107,53,0.3)`,
  transition: 'transform 200ms, filter 200ms',
};

const secondaryBtn = {
  padding: '11px 24px',
  borderRadius: '8px',
  border: `1.5px solid ${C.border}`,
  cursor: 'pointer',
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: '16px',
  letterSpacing: '0.1em',
  color: C.accent,
  background: 'rgba(255,107,53,0.06)',
  transition: 'background 200ms, border-color 200ms',
};

const uploadBtn = {
  width: '100%',
  padding: '16px 18px',
  borderRadius: '12px',
  cursor: 'pointer',
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: '18px',
  letterSpacing: '0.1em',
  color: '#fff',
  textAlign: 'center',
  background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentPink} 100%)`,
  boxShadow: `0 14px 32px rgba(255,107,53,0.28)`,
  border: 'none',
};

export default function HostRoom({ onBack }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [subUrl, setSubUrl] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [clientsConnected, setClientsConnected] = useState(0);

  // NEW: State for Aspect Ratio & Toast Notification
  const [aspectIndex, setAspectIndex] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const toastTimeoutRef = useRef(null);

  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const peersRef = useRef({});

  // NEW: Keyboard Listener for 'C' Key
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key.toLowerCase() === 'c') {
        setAspectIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % aspectModes.length;
          
          // Show Toast
          setShowToast(true);
          
          // Clear any existing timeout so it doesn't flicker on rapid presses
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          
          // Hide toast after 2 seconds
          toastTimeoutRef.current = setTimeout(() => setShowToast(false), 2000);
          
          return nextIndex;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // WebRTC & Socket Connection
  useEffect(() => {
    socketRef.current = io('https://various-communication-utils-organic.trycloudflare.com', { transports: ['websocket'] });
    const newRoomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    setRoomId(newRoomId);
    socketRef.current.emit('create-room', newRoomId);

    socketRef.current.on('client-joined', async ({ clientId, wantsVideo }) => {
      setClientsConnected((prev) => prev + 1);
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'turn:global.relay.metered.ca:80', username: 'edb73dc2124be5205d93f824', credential: '7iBXpb0dzl8dmrv8' },
          { urls: 'turn:global.relay.metered.ca:443', username: 'edb73dc2124be5205d93f824', credential: '7iBXpb0dzl8dmrv8' }
        ]
      });
      peersRef.current[clientId] = peer;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          if (track.kind === 'video' && !wantsVideo) return;
          peer.addTrack(track, streamRef.current);
        });
      }
      peer.onicecandidate = (event) => {
        if (event.candidate) socketRef.current.emit('ice-candidate', { candidate: event.candidate, to: clientId });
      };
      const offer = await peer.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
      const senders = peer.getSenders();
      const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
      if (audioSender) {
        const params = audioSender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].maxBitrate = 256000;
        audioSender.setParameters(params);
      }
      await peer.setLocalDescription(offer);
      socketRef.current.emit('webrtc-offer', { offer, to: clientId });
    });

    socketRef.current.on('webrtc-answer', async ({ answer, from }) => {
      if (peersRef.current[from]) await peersRef.current[from].setRemoteDescription(new RTCSessionDescription(answer));
    });
    socketRef.current.on('ice-candidate', async ({ candidate, from }) => {
      if (peersRef.current[from]) await peersRef.current[from].addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socketRef.current.disconnect();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (subUrl) URL.revokeObjectURL(subUrl);
    };
  }, []);

  const handleFileChange = (e) => { const f = e.target.files[0]; if (f) setVideoUrl(URL.createObjectURL(f)); };
  const handleSubChange = (e) => { const f = e.target.files[0]; if (f) setSubUrl(URL.createObjectURL(f)); };
  const handleVideoLoaded = () => {
    if (!streamRef.current && videoRef.current) {
      const capture = videoRef.current.captureStream || videoRef.current.mozCaptureStream;
      if (capture) streamRef.current = capture.call(videoRef.current);
    }
  };

  return (
    <div style={roomPageStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Bebas+Neue&display=swap');
        @keyframes roomSlideIn {
          from { opacity: 0; transform: translateY(30px); filter: blur(6px); }
          to   { opacity: 1; transform: none; filter: none; }
        }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,107,53,0.4); } 50% { box-shadow: 0 0 0 8px rgba(255,107,53,0); } }
        @keyframes rotateDot { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .host-primary:hover { transform: translateY(-3px); filter: brightness(1.08); }
        .host-secondary:hover { background: rgba(255,107,53,0.10) !important; border-color: #ff6b35 !important; }
      `}</style>

      {/* ── Navbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px', borderBottom: `2px solid rgba(255,107,53,0.12)`,
        background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(14px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: '0.12em', color: C.text }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'conic-gradient(#ff6b35, #ffd166, #ff4d8d, #00b8a9, #ff6b35)', display: 'inline-block', animation: 'rotateDot 3s linear infinite', boxShadow: '0 0 10px rgba(255,107,53,0.5)' }} />
          SONIC FLOW
        </div>

        {/* NEW: Flowing Colorful Particles */}
        <div className="particle-stream">
          <div className="shape circle p1"></div>
          <div className="shape square p2"></div>
          <div className="shape triangle p3"></div>
          <div className="shape circle p4"></div>
          <div className="shape square p5"></div>
          <div className="shape triangle p6"></div>
          <div className="shape circle p7"></div>
          <div className="shape triangle p8"></div>
          <div className="shape square p9"></div>
          <div className="shape circle p10"></div>
          <div className="shape square p11"></div>
          <div className="shape triangle p12"></div>
        </div>

        <button className="host-secondary" onClick={onBack} style={secondaryBtn}>← Back</button>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '28px 22px 48px' }}>

        {/* ── Header card ── */}
        <div style={{ ...card({ padding: '24px 28px', textAlign: 'center', marginBottom: 24 }) }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: '999px',
            background: 'rgba(255,107,53,0.08)', border: `1.5px solid rgba(255,107,53,0.2)`,
            color: C.accent, fontWeight: 700, fontSize: 13, letterSpacing: '0.12em',
            marginBottom: 14,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c97a', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            ROOM HOST
          </div>

          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(2rem, 4vw, 3.2rem)',
            letterSpacing: '0.08em', lineHeight: 1,
            background: `linear-gradient(135deg, ${C.text} 0%, ${C.accent} 40%, ${C.accentPink} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: '0 0 8px',
          }}>
            Sonic Flow Host
          </h2>
          <p style={{ margin: 0, color: C.muted, fontSize: '1rem' }}>
            Load a movie, add subtitles, and share the room code.
          </p>

          {/* Room code */}
          <div style={{ marginTop: 20, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '16px 28px', borderRadius: 14,
            background: 'rgba(255,107,53,0.06)', border: `1.5px solid rgba(255,209,102,0.35)`,
          }}>
            <span style={{ fontSize: 12, letterSpacing: '0.28em', color: C.muted, fontWeight: 700 }}>ROOM CODE</span>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '2.4rem', letterSpacing: '0.3em',
              background: `linear-gradient(90deg, ${C.accent}, ${C.accentPink})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{roomId}</span>
            <span style={{ fontSize: 13, color: '#00c97a', fontWeight: 700 }}>
              ● {clientsConnected} Viewer{clientsConnected !== 1 ? 's' : ''} Connected
            </span>
          </div>
        </div>

        {/* ── Upload / Player ── */}
        {!videoUrl ? (
          <div style={{ maxWidth: 500, margin: '0 auto', display: 'grid', gap: 14 }}>
            <label className="host-primary" style={{ ...uploadBtn, display: 'block', cursor: 'pointer' }}>
              🎥 SELECT MP4 MOVIE
              <input type="file" accept="video/mp4" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>

            <label style={{
              ...card({ padding: '15px 18px', display: 'block', cursor: 'pointer' }),
              color: C.muted, fontWeight: 700, fontSize: 15,
            }}>
              📝 Add Subtitles (.vtt)
              <input type="file" accept=".vtt" onChange={handleSubChange} style={{ display: 'none' }} />
            </label>

            {subUrl && (
              <div style={{ ...card({ padding: '12px 16px', textAlign: 'center' }), color: '#00c97a', fontWeight: 800, fontSize: 15 }}>
                ✅ Subtitles Loaded
              </div>
            )}
          </div>
        ) : (
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            
            {/* NEW: Added position: 'relative' to the card so the toast positions inside it */}
            <div style={{ ...card({ padding: 14, overflow: 'hidden', position: 'relative' }) }}>
              
              {/* NEW: Aspect Ratio Toast Notification */}
              {showToast && (
                <div style={{
                  position: 'absolute',
                  top: '30px',
                  right: '30px',
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(0, 201, 122, 0.4)',
                  color: '#00c97a',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '1.4rem',
                  letterSpacing: '0.1em',
                  zIndex: 50,
                  pointerEvents: 'none',
                  animation: 'roomSlideIn 0.2s ease both'
                }}>
                  FORMAT: {aspectModes[aspectIndex].label}
                </div>
              )}

               {/* The Wrapper Div handles the shape and size instantly */}
<div style={{
  width: '100%',
  aspectRatio: aspectModes[aspectIndex].value,
  backgroundColor: '#000000',
  borderRadius: 14,
  overflow: 'hidden', // This forces the video to stay inside the box
  boxShadow: `0 18px 50px rgba(255,107,53,0.15)`
}}>
  <video
    ref={videoRef}
    src={videoUrl}
    controls
    onLoadedData={handleVideoLoaded}
    onPlay={() => socketRef.current.emit('host-played', roomId)}
    onPause={() => socketRef.current.emit('host-paused', roomId)}
    style={{
      width: '100%', 
      height: '100%', // Video just fills whatever shape the wrapper is
      objectFit: aspectModes[aspectIndex].value === 'auto' ? 'contain' : 'fill',
      backgroundColor: '#000000',
    }}
  >
    {subUrl && <track kind="subtitles" src={subUrl} label="English" srcLang="en" default />}
  </video>
</div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <button className="host-secondary" onClick={() => { setVideoUrl(null); setSubUrl(null); }} style={secondaryBtn}>
                Change Movie
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}