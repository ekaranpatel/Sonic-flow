 import { useState, useEffect } from 'react';
import HostRoom from './components/HostRoom';
import ClientRoom from './components/ClientRoom';
import './index.css';

function App() {
  const [role, setRole] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [activeButton, setActiveButton] = useState(null);
  const [showAbout, setShowAbout] = useState(false); 

  useEffect(() => {
    const root = document.documentElement;
    const move = (e) => {
      root.style.setProperty('--mx', `${e.clientX}px`);
      root.style.setProperty('--my', `${e.clientY}px`);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  const openRoom = (nextRole) => {
    setActiveButton(nextRole);
    setTransitioning(true);
    setTimeout(() => setRole(nextRole), 360);
  };

  if (role === 'host') return <HostRoom onBack={() => setRole(null)} />;
  if (role === 'client') return <ClientRoom onBack={() => setRole(null)} />;

  return (
    <>
      <div className={`spline-page ${transitioning ? 'page-exit' : ''}`}>
        <div className="noise" />
        <div className="gridGlow" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
        <div className="orb orb-5" />

          <header className="navbar">
          <div className="logo">
            <span className="logoDot" />
            Sonic Flow
          </div>

           {/* Flowing Colorful Particles */}
          <div className="particle-stream">
            {/* Original 6 */}
            <div className="shape circle p1"></div>
            <div className="shape square p2"></div>
            <div className="shape triangle p3"></div>
            <div className="shape circle p4"></div>
            <div className="shape square p5"></div>
            <div className="shape triangle p6"></div>
            {/* NEW 6 */}
            <div className="shape circle p7"></div>
            <div className="shape triangle p8"></div>
            <div className="shape square p9"></div>
            <div className="shape circle p10"></div>
            <div className="shape square p11"></div>
            <div className="shape triangle p12"></div>
          </div>
          <div className="navButtons">
            <button className="ghostBtn" onClick={() => setShowAbout(true)}>About</button>
          </div>
        </header>
        <main className="hero">
          <div className="heroCard">
            <p className="eyebrow">LOCAL MOVIE STREAMING</p>

            <h1>Your Local Cinematic Universe</h1>

            <p className="subtext">
               Stream local movies with perfectly synced audio across multiple audio devices, subtitles, and zero-latency playback.
            </p>

            <div className="cta">
              <button
                className={`primary ${activeButton === 'host' ? 'pressed' : ''}`}
                onClick={() => openRoom('host')}
              >
                Host a Movie →
              </button>

              <button
                className={`secondary ${activeButton === 'client' ? 'pressed' : ''}`}
                onClick={() => openRoom('client')}
              >
                Join Room
              </button>
            </div>
          </div>
        </main>

        {/* About Modal */}
        {showAbout && (
          <div className="modal-overlay" onClick={() => setShowAbout(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>The Sonic Flow Vision</h2>
              <p>
                Sonic Flow was engineered to bridge the gap between shared physical spaces and seamless digital cinematic experiences. By bypassing restrictive network isolations and leveraging WebRTC, this platform ensures that viewers can enjoy high-fidelity, perfectly synchronized studio audio and video with absolute zero latency. No internet bottlenecks, no audio delays—just pure, uninterrupted entertainment.
              </p>
              <button className="primary" onClick={() => setShowAbout(false)} style={{ width: '100%' }}>
                Return to Hub
              </button>
            </div>
          </div>
        )}
      </div>

       {/* Scrollable White Strip Footer placed outside the main layout */}
      <footer className="dev-footer">
        <p>Developed by <strong>Karan Patel (BTMC25O1057)</strong></p>
        <div className="footer-links">
          <a href="mailto:ekaranpatel@gmail.com">ekaranpatel@gmail.com</a>
          <span>|</span>
          <a href="https://github.com/ekaranpatel" target="_blank" rel="noreferrer">GitHub</a>
          <span>|</span>
          <a href="https://www.linkedin.com/in/karan-patel-b05378205/?lipi=urn%3Ali%3Apage%3Ad_flagship3_feed%3BpASSr%2FhWQ0aDiytHVCh47g%3D%3D" target="_blank" rel="noreferrer">LinkedIn</a>
        </div>
        <p className="college-text">Madhav Institute of Technology & Science Gwalior</p>
      </footer>
    </>
  );
}

export default App;