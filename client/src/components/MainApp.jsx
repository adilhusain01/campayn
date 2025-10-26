import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet.js';
import CreateCampaign from './CreateCampaign.jsx';
import CampaignList from './CampaignList.jsx';
import InfluencerDashboard from './InfluencerDashboard.jsx';
import Profile from './Profile.jsx';
import { Link, useSearchParams } from 'react-router-dom';

function MainApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('campaigns');
  const {
    address: walletAddress,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    user,
    authenticated,
    ready
  } = useWallet();

  // Initialize active tab from URL params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['campaigns', 'create', 'influencer', 'profile'];

    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else {
      // Set default tab in URL if none exists
      setSearchParams({ tab: 'campaigns' });
    }
  }, [searchParams, setSearchParams]);

  // Handle tab switching with URL update
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

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
      <div className="max-w-6xl mx-auto px-5">
      <header className="bg-black text-white py-8 -mx-5 mb-8 pixel-shadow relative overflow-hidden" style={{
        clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'
      }}>
        {/* Pixelated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `
              repeating-linear-gradient(90deg, transparent, transparent 8px, #DECDF5 8px, #DECDF5 16px),
              repeating-linear-gradient(0deg, transparent, transparent 8px, #DECDF5 8px, #DECDF5 16px)
            `,
            backgroundSize: '16px 16px'
          }}></div>
        </div>

        {/* Pixelated Corner Decorations */}
        <div className="absolute top-0 left-0 w-8 h-8 bg-[#DECDF5]" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'
        }}></div>
        <div className="absolute top-0 right-0 w-8 h-8 bg-[#DECDF5]" style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 100%, 50% 50%, 0 50%)'
        }}></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 bg-[#DECDF5]" style={{
          clipPath: 'polygon(0 0, 50% 0, 50% 50%, 100% 50%, 100% 100%, 0 100%)'
        }}></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#DECDF5]" style={{
          clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 0 100%, 0 50%, 50% 50%)'
        }}></div>

        <div className="max-w-6xl mx-auto px-5 flex justify-between items-center flex-wrap gap-6 relative z-10">
          {/* Logo with pixelated border */}
          <Link to="/">
          <img
            src="/campayn-banner.png"
            alt="Campayn"
            className="h-16 w-auto"
            style={{ imageRendering: 'pixelated' }}
          />
          </Link>
       

          <div className="flex items-center gap-4">
            {!isConnected || isConnecting || !ready ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting || !ready}
                className="pixel-button px-6 py-3 text-sm font-bold"
              >
                {(isConnecting || !ready) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin" style={{
                      borderRadius: 0
                    }}></div>
                    {!ready ? 'LOADING...' : 'CONNECTING...'}
                  </div>
                ) : (
                  <>▶ CONNECT WALLET</>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-white text-black px-4 py-2 pixel-border">
                  <div className="w-3 h-3 bg-green-500 animate-pulse" style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
                  }}></div>
                  <div className="flex flex-col">
                    {user?.google?.email && (
                      <span className="text-xs font-bold leading-tight" style={{
                        fontFamily: "'Orbitron', monospace"
                      }}>
                        {user.google.email}
                      </span>
                    )}
                    <span className="font-black text-sm" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="text-white hover:bg-white hover:text-black px-3 py-1 border-2 border-white font-bold text-xs transition-all duration-100"
                  style={{
                    fontFamily: "'Orbitron', monospace",
                    textTransform: 'uppercase'
                  }}
                >
                  ✕ DISCONNECT
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isConnected && (
        <nav className="flex gap-2 mb-8 bg-black p-2 pixel-shadow" style={{
          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
        }}>
          <button
            className={`flex-1 py-3 px-4 font-bold text-sm transition-all duration-100 pixel-border ${
              activeTab === 'campaigns'
                ? 'bg-white text-black'
                : 'bg-transparent text-white hover:bg-white hover:text-black'
            }`}
            style={{ fontFamily: "'Orbitron', monospace", textTransform: 'uppercase' }}
            onClick={() => handleTabChange('campaigns')}
          >
            ▶ BROWSE CAMPAIGNS
          </button>
          <button
            className={`flex-1 py-3 px-4 font-bold text-sm transition-all duration-100 pixel-border ${
              activeTab === 'create'
                ? 'bg-white text-black'
                : 'bg-transparent text-white hover:bg-white hover:text-black'
            }`}
            style={{ fontFamily: "'Orbitron', monospace", textTransform: 'uppercase' }}
            onClick={() => handleTabChange('create')}
          >
            ★ CREATE CAMPAIGN
          </button>
          <button
            className={`flex-1 py-3 px-4 font-bold text-sm transition-all duration-100 pixel-border ${
              activeTab === 'influencer'
                ? 'bg-white text-black'
                : 'bg-transparent text-white hover:bg-white hover:text-black'
            }`}
            style={{ fontFamily: "'Orbitron', monospace", textTransform: 'uppercase' }}
            onClick={() => handleTabChange('influencer')}
          >
            ◆ INFLUENCER DASHBOARD
          </button>
          <button
            className={`flex-1 py-3 px-4 font-bold text-sm transition-all duration-100 pixel-border ${
              activeTab === 'profile'
                ? 'bg-white text-black'
                : 'bg-transparent text-white hover:bg-white hover:text-black'
            }`}
            style={{ fontFamily: "'Orbitron', monospace", textTransform: 'uppercase' }}
            onClick={() => handleTabChange('profile')}
          >
            💎 WALLET & PROFILE
          </button>
        </nav>
      )}

      <main>
        {(!isConnected && !isConnecting && ready) ? (
          <div className="text-center py-12">
            <h2 className="text-4xl font-black mb-6 pixel-text-shadow" style={{
              fontFamily: "'Orbitron', monospace",
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>WELCOME TO CAMPAYN</h2>
            <p className="text-black mb-8 text-lg font-bold" style={{
              fontFamily: "'Orbitron', monospace"
            }}>CONNECT WALLET FOR PIXEL MARKETING CAMPAIGNS</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="bg-white pixel-border pixel-shadow p-6">
                <h3 className="text-black text-xl font-black mb-4 text-center" style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}>▲ FOR COMPANIES</h3>
                <ul className="text-left list-none p-0 space-y-3">
                  <li className="flex items-center py-2">
                    <span className="text-green-600 font-black mr-3 text-lg">►</span>
                    <span className="font-bold" style={{ fontFamily: "'Orbitron', monospace" }}>CREATE CAMPAIGNS WITH STT REWARDS</span>
                  </li>
                  <li className="flex items-center py-2">
                    <span className="text-green-600 font-black mr-3 text-lg">►</span>
                    <span className="font-bold" style={{ fontFamily: "'Orbitron', monospace" }}>SET REQUIREMENTS AND DEADLINES</span>
                  </li>
                  <li className="flex items-center py-2">
                    <span className="text-green-600 font-black mr-3 text-lg">►</span>
                    <span className="font-bold" style={{ fontFamily: "'Orbitron', monospace" }}>AUTOMATIC WINNER SELECTION</span>
                  </li>
                </ul>
              </div>
              <div className="bg-white pixel-border pixel-shadow p-6">
                <h3 className="text-black text-xl font-black mb-4 text-center" style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}>◆ FOR INFLUENCERS</h3>
                <ul className="text-left list-none p-0 space-y-3">
                  <li className="flex items-center py-2">
                    <span className="text-purple-600 font-black mr-3 text-lg">►</span>
                    <span className="font-bold" style={{ fontFamily: "'Orbitron', monospace" }}>REGISTER FOR CAMPAIGNS</span>
                  </li>
                  <li className="flex items-center py-2">
                    <span className="text-purple-600 font-black mr-3 text-lg">►</span>
                    <span className="font-bold" style={{ fontFamily: "'Orbitron', monospace" }}>SUBMIT YOUTUBE VIDEOS</span>
                  </li>
                  <li className="flex items-center py-2">
                    <span className="text-purple-600 font-black mr-3 text-lg">►</span>
                    <span className="font-bold" style={{ fontFamily: "'Orbitron', monospace" }}>EARN STT REWARDS</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'campaigns' && <CampaignList walletAddress={walletAddress} />}
            {activeTab === 'create' && <CreateCampaign walletAddress={walletAddress} />}
            {activeTab === 'influencer' && <InfluencerDashboard walletAddress={walletAddress} />}
            {activeTab === 'profile' && <Profile walletAddress={walletAddress} />}
          </>
        )}
      </main>
      </div>
    </div>
  );
}

export default MainApp;