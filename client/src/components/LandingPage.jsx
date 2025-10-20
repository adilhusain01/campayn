import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#DECDF5',
      backgroundImage: `
        repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(0,0,0,0.02) 20px, rgba(0,0,0,0.02) 40px),
        repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,0,0,0.02) 20px, rgba(0,0,0,0.02) 40px)
      `,
      backgroundSize: '40px 40px',
      fontFamily: "'Orbitron', monospace",
      imageRendering: 'pixelated'
    }}>
      {/* Navigation */}
      <nav className="bg-black text-white pixel-shadow" style={{
        clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)'
      }}>
        <div className="max-w-6xl mx-auto px-5 py-6 flex justify-between items-center">
            <img
              src="/campayn-banner.png"
              alt="Campayn"
              className="h-16 w-auto"
              style={{ imageRendering: 'pixelated' }}
            />
          <Link
            to="/app"
            className="pixel-button px-6 py-3 text-sm font-bold"
          >
            ▶ LAUNCH APP
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-5 pt-20 pb-16 text-center">
        <h1 className="text-6xl md:text-8xl font-black mb-8 pixel-text-shadow" style={{
          fontFamily: "'Orbitron', monospace",
          textTransform: 'uppercase',
          letterSpacing: '4px',
          lineHeight: '1.1'
        }}>
          JOIN THE
          <br />
          <span className="text-5xl md:text-6xl">REVOLUTION</span>
        </h1>

        <p className="text-xl text-black mb-12 max-w-2xl mx-auto font-bold" style={{
          fontFamily: "'Orbitron', monospace",
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          BLOCKCHAIN-POWERED CAMPAIGNS ● TRANSPARENT REWARDS ● ZERO MIDDLEMEN
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/app"
            className="pixel-button px-8 py-4 text-lg font-black pixel-shadow"
          >
            ★ GET STARTED NOW
          </Link>
          <div className="bg-white pixel-border p-4 text-black font-bold" style={{
            fontFamily: "'Orbitron', monospace"
          }}>
            FLOW BLOCKCHAIN POWERED
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white pixel-border pixel-shadow p-6">
            <div className="bg-black text-white w-16 h-16 flex items-center justify-center mb-6 pixel-border" style={{
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
            }}>
              <span className="text-2xl font-black" style={{ fontFamily: "'Orbitron', monospace" }}>▲</span>
            </div>
            <h3 className="text-2xl font-black text-black mb-6" style={{
              fontFamily: "'Orbitron', monospace",
              textTransform: 'uppercase'
            }}>FOR COMPANIES</h3>
            <ul className="space-y-4">
              <li className="flex items-center">
                <span className="text-green-600 font-black mr-4 text-xl">►</span>
                <span className="font-bold text-black" style={{ fontFamily: "'Orbitron', monospace" }}>CREATE CAMPAIGNS WITH FLOW REWARDS</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-600 font-black mr-4 text-xl">►</span>
                <span className="font-bold text-black" style={{ fontFamily: "'Orbitron', monospace" }}>SET REQUIREMENTS AND DEADLINES</span>
              </li>
              <li className="flex items-center">
                <span className="text-green-600 font-black mr-4 text-xl">►</span>
                <span className="font-bold text-black" style={{ fontFamily: "'Orbitron', monospace" }}>AUTOMATIC WINNER SELECTION</span>
              </li>
            </ul>
          </div>

          <div className="bg-white pixel-border pixel-shadow p-6">
            <div className="bg-black text-white w-16 h-16 flex items-center justify-center mb-6 pixel-border" style={{
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
            }}>
              <span className="text-2xl font-black" style={{ fontFamily: "'Orbitron', monospace" }}>◆</span>
            </div>
            <h3 className="text-2xl font-black text-black mb-6" style={{
              fontFamily: "'Orbitron', monospace",
              textTransform: 'uppercase'
            }}>FOR INFLUENCERS</h3>
            <ul className="space-y-4">
              <li className="flex items-center">
                <span className="text-purple-600 font-black mr-4 text-xl">►</span>
                <span className="font-bold text-black" style={{ fontFamily: "'Orbitron', monospace" }}>REGISTER FOR CAMPAIGNS</span>
              </li>
              <li className="flex items-center">
                <span className="text-purple-600 font-black mr-4 text-xl">►</span>
                <span className="font-bold text-black" style={{ fontFamily: "'Orbitron', monospace" }}>SUBMIT YOUTUBE VIDEOS</span>
              </li>
              <li className="flex items-center">
                <span className="text-purple-600 font-black mr-4 text-xl">►</span>
                <span className="font-bold text-black" style={{ fontFamily: "'Orbitron', monospace" }}>EARN FLOW REWARDS</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-8 pixel-shadow" style={{
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)'
      }}>
        <div className="text-center">
          <p className="font-bold" style={{
            fontFamily: "'Orbitron', monospace",
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            © 2024 CAMPAYN ● PIXEL MARKETING PLATFORM ● FLOW BLOCKCHAIN
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;