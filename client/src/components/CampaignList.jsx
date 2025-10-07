import { useState, useEffect } from 'react';
import { web3Service } from '../utils/web3.js';
import axios from 'axios';

const CampaignList = ({ walletAddress }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [registering, setRegistering] = useState({});

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const activeCampaignIds = await web3Service.getActiveCampaigns();

      const campaignPromises = activeCampaignIds.map(async (id) => {
        const [blockchainInfo, dbInfo] = await Promise.all([
          web3Service.getCampaignInfo(id),
          axios.get(`http://localhost:3001/api/campaigns/${id}`).catch(() => ({ data: null }))
        ]);

        return {
          id,
          ...blockchainInfo,
          ...dbInfo.data
        };
      });

      const campaignData = await Promise.all(campaignPromises);
      setCampaigns(campaignData);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (campaignId) => {
    setRegistering({ ...registering, [campaignId]: true });

    try {
      await web3Service.registerInfluencer(campaignId);
      alert('Successfully registered for campaign!');
      loadCampaigns();
    } catch (error) {
      console.error('Error registering:', error);
      alert('Failed to register. Please try again.');
    } finally {
      setRegistering({ ...registering, [campaignId]: false });
    }
  };

  const viewCampaignDetails = async (campaign) => {
    try {
      const [submissions, leaderboard] = await Promise.all([
        axios.get(`http://localhost:3001/api/campaigns/${campaign.id}/submissions`),
        axios.get(`http://localhost:3001/api/campaigns/${campaign.id}/leaderboard`)
      ]);

      setSelectedCampaign({
        ...campaign,
        submissions: submissions.data,
        leaderboard: leaderboard.data
      });
    } catch (error) {
      console.error('Error loading campaign details:', error);
      setSelectedCampaign(campaign);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (campaign) => {
    const now = Date.now();
    if (now < campaign.registrationEnd) {
      return { text: 'Registration Open', class: 'status-open' };
    } else if (now < campaign.campaignEnd) {
      return { text: 'Active', class: 'status-active' };
    } else {
      return { text: 'Ended', class: 'status-ended' };
    }
  };

  if (loading) {
    return <div className="loading">Loading campaigns...</div>;
  }

  if (selectedCampaign) {
    return (
      <div className="campaign-details">
        <button
          onClick={() => setSelectedCampaign(null)}
          className="back-btn"
        >
          ← Back to Campaigns
        </button>

        <h2>{selectedCampaign.title}</h2>

        <div className="campaign-info-grid">
          <div className="info-card">
            <h3>Campaign Info</h3>
            <p><strong>Description:</strong> {selectedCampaign.description}</p>
            <p><strong>Requirements:</strong> {selectedCampaign.requirements}</p>
            <p><strong>Total Reward:</strong> {selectedCampaign.totalReward} ETH</p>
            <p><strong>Participants:</strong> {selectedCampaign.influencerCount}</p>
            <p><strong>Registration Ends:</strong> {formatDate(selectedCampaign.registrationEnd)}</p>
            <p><strong>Campaign Ends:</strong> {formatDate(selectedCampaign.campaignEnd)}</p>
          </div>

          {selectedCampaign.leaderboard && selectedCampaign.leaderboard.length > 0 && (
            <div className="info-card">
              <h3>Current Leaderboard</h3>
              <div className="leaderboard">
                {selectedCampaign.leaderboard.slice(0, 10).map((submission, index) => (
                  <div key={submission.id} className="leaderboard-item">
                    <span className="rank">#{index + 1}</span>
                    <span className="channel">{submission.youtube_channel_name}</span>
                    <span className="score">{Math.round(submission.performanceScore || submission.performance_score || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedCampaign.submissions && selectedCampaign.submissions.length > 0 && (
          <div className="submissions-section">
            <h3>Recent Submissions</h3>
            <div className="submissions-grid">
              {selectedCampaign.submissions.slice(0, 6).map((submission) => (
                <div key={submission.id} className="submission-card">
                  <a
                    href={submission.youtubeUrl || submission.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="video-link"
                  >
                    <div className="video-thumbnail">
                      {(submission.youtubeVideoId || submission.youtube_video_id) ? (
                        <img
                          src={`https://img.youtube.com/vi/${submission.youtubeVideoId || submission.youtube_video_id}/mqdefault.jpg`}
                          alt="Video thumbnail"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="no-thumbnail">No Video</div>
                      )}
                    </div>
                  </a>
                  <div className="submission-info">
                    <p className="channel-name">{submission.youtube_channel_name}</p>
                    <div className="stats">
                      <span>👀 {(submission.viewCount || submission.view_count || 0).toLocaleString()}</span>
                      <span>👍 {(submission.likeCount || submission.like_count || 0).toLocaleString()}</span>
                      <span>💬 {(submission.commentCount || submission.comment_count || 0).toLocaleString()}</span>
                    </div>
                    <p className="score">Score: {Math.round(submission.performanceScore || submission.performance_score || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="campaign-list">
      <h2>Active Campaigns</h2>

      {campaigns.length === 0 ? (
        <div className="no-campaigns">
          <p>No active campaigns found.</p>
          <p>Check back later or create your own campaign!</p>
        </div>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map((campaign) => {
            const status = getStatusBadge(campaign);
            return (
              <div key={campaign.id} className="campaign-card">
                <div className="campaign-header">
                  <h3>{campaign.title || `Campaign #${campaign.id}`}</h3>
                  <span className={`status-badge ${status.class}`}>
                    {status.text}
                  </span>
                </div>

                <div className="campaign-body">
                  <p className="description">
                    {campaign.description || 'No description available'}
                  </p>

                  <div className="campaign-stats">
                    <div className="stat">
                      <strong>{campaign.totalReward} ETH</strong>
                      <span>Total Reward</span>
                    </div>
                    <div className="stat">
                      <strong>{campaign.influencerCount}</strong>
                      <span>Participants</span>
                    </div>
                  </div>

                  <div className="campaign-dates">
                    <p><strong>Registration:</strong> {formatDate(campaign.registrationEnd)}</p>
                    <p><strong>Campaign End:</strong> {formatDate(campaign.campaignEnd)}</p>
                  </div>
                </div>

                <div className="campaign-actions">
                  <button
                    onClick={() => viewCampaignDetails(campaign)}
                    className="view-btn"
                  >
                    View Details
                  </button>

                  {Date.now() < campaign.registrationEnd && (
                    <button
                      onClick={() => handleRegister(campaign.id)}
                      disabled={registering[campaign.id]}
                      className="register-btn"
                    >
                      {registering[campaign.id] ? 'Registering...' : 'Register'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignList;