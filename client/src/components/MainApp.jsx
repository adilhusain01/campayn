import { useState } from 'react';
import { useWallet } from '../hooks/useWallet.js';
import CreateCampaign from './CreateCampaign.jsx';
import CampaignList from './CampaignList.jsx';
import InfluencerDashboard from './InfluencerDashboard.jsx';

function MainApp() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const {
    address: walletAddress,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    user
  } = useWallet();

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#f5f6f8',
      backgroundImage: `
        radial-gradient(circle at 25px 25px, rgba(99, 102, 241, 0.04) 2%, transparent 50%),
        radial-gradient(circle at 75px 75px, rgba(147, 51, 234, 0.04) 2%, transparent 50%)
      `,
      backgroundSize: '100px 100px'
    }}>
      <div className="max-w-6xl mx-auto px-5">
      <header className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-8 -mx-5 mb-8 rounded-b-3xl">
        <div className="max-w-6xl mx-auto px-5 flex justify-between items-center flex-wrap gap-4">
            <h1 className="text-4xl font-bold">Campayn</h1>

          <div className="flex items-center gap-4">
            {!isConnected ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-white/20 border-2 border-white/30 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 hover:border-white/50 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="flex items-center gap-4 bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                <div className="flex items-center gap-2">
                  {user?.google?.email && (
                    <span className="text-sm text-white/80">
                      {user.google.email}
                    </span>
                  )}
                  <span className="font-mono font-semibold">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-white/20 border border-white/30 text-white px-4 py-2 rounded-lg text-sm hover:bg-white/30 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isConnected && (
        <nav className="flex gap-1 mb-8 bg-gradient-to-r from-slate-100 to-gray-100 p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button
            className={`flex-1 py-3 px-4 border-none rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'campaigns'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md transform scale-105'
                : 'bg-transparent text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 hover:shadow-sm'
            }`}
            onClick={() => setActiveTab('campaigns')}
          >
            Browse Campaigns
          </button>
          <button
            className={`flex-1 py-3 px-4 border-none rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md transform scale-105'
                : 'bg-transparent text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:text-emerald-700 hover:shadow-sm'
            }`}
            onClick={() => setActiveTab('create')}
          >
            Create Campaign
          </button>
          <button
            className={`flex-1 py-3 px-4 border-none rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'influencer'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md transform scale-105'
                : 'bg-transparent text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 hover:shadow-sm'
            }`}
            onClick={() => setActiveTab('influencer')}
          >
            Influencer Dashboard
          </button>
        </nav>
      )}

      <main>
        {!isConnected ? (
          <div className="text-center py-12">
            <h2 className="text-gray-800 text-3xl font-semibold mb-4">Welcome to Campayn</h2>
            <p className="text-gray-600 mb-8">Sign in with Google or connect your wallet to get started with decentralized ad campaigns</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl shadow-sm border border-blue-100">
                <h3 className="text-indigo-600 text-xl font-semibold mb-4">For Companies</h3>
                <ul className="text-left list-none p-0 space-y-2">
                  <li className="py-2 border-b border-gray-50 last:border-b-0">
                    <span className="text-green-600 font-bold mr-2">✓</span>
                    Create campaigns with FLOW rewards
                  </li>
                  <li className="py-2 border-b border-gray-50 last:border-b-0">
                    <span className="text-green-600 font-bold mr-2">✓</span>
                    Set requirements and deadlines
                  </li>
                  <li className="py-2 border-b border-gray-50 last:border-b-0">
                    <span className="text-green-600 font-bold mr-2">✓</span>
                    Automatic winner selection
                  </li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-xl shadow-sm border border-purple-100">
                <h3 className="text-purple-600 text-xl font-semibold mb-4">For Influencers</h3>
                <ul className="text-left list-none p-0 space-y-2">
                  <li className="py-2 border-b border-gray-50 last:border-b-0">
                    <span className="text-green-600 font-bold mr-2">✓</span>
                    Register for campaigns
                  </li>
                  <li className="py-2 border-b border-gray-50 last:border-b-0">
                    <span className="text-green-600 font-bold mr-2">✓</span>
                    Submit YouTube videos
                  </li>
                  <li className="py-2 border-b border-gray-50 last:border-b-0">
                    <span className="text-green-600 font-bold mr-2">✓</span>
                    Earn FLOW based on performance
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
          </>
        )}
      </main>
      </div>
    </div>
  );
}

export default MainApp;