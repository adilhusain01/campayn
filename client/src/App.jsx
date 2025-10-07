import { useState, useEffect } from 'react';
import { web3Service } from './utils/web3.js';
import CreateCampaign from './components/CreateCampaign.jsx';
import CampaignList from './components/CampaignList.jsx';
import InfluencerDashboard from './components/InfluencerDashboard.jsx';
import './App.css';

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          await web3Service.connectWallet();
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const connectWallet = async () => {
    setLoading(true);
    try {
      const address = await web3Service.connectWallet();
      setWalletAddress(address);
      setIsConnected(true);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setIsConnected(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Campayn</h1>
          <p>Decentralized Social Media Ad Campaigns on Base</p>

          <div className="wallet-section">
            {!isConnected ? (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="connect-wallet-btn"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="wallet-info">
                <span className="wallet-address">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                <button onClick={disconnectWallet} className="disconnect-btn">
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isConnected && (
        <nav className="tab-navigation">
          <button
            className={activeTab === 'campaigns' ? 'active' : ''}
            onClick={() => setActiveTab('campaigns')}
          >
            Browse Campaigns
          </button>
          <button
            className={activeTab === 'create' ? 'active' : ''}
            onClick={() => setActiveTab('create')}
          >
            Create Campaign
          </button>
          <button
            className={activeTab === 'influencer' ? 'active' : ''}
            onClick={() => setActiveTab('influencer')}
          >
            Influencer Dashboard
          </button>
        </nav>
      )}

      <main className="main-content">
        {!isConnected ? (
          <div className="welcome-screen">
            <h2>Welcome to Campayn</h2>
            <p>Connect your wallet to get started with decentralized ad campaigns</p>
            <div className="features">
              <div className="feature">
                <h3>For Companies</h3>
                <ul>
                  <li>Create campaigns with ETH rewards</li>
                  <li>Set requirements and deadlines</li>
                  <li>Automatic winner selection</li>
                </ul>
              </div>
              <div className="feature">
                <h3>For Influencers</h3>
                <ul>
                  <li>Register for campaigns</li>
                  <li>Submit YouTube videos</li>
                  <li>Earn ETH based on performance</li>
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
  );
}

export default App;
