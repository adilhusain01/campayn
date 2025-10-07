import { useState, useEffect } from 'react';
import { web3Service } from '../utils/web3.js';
import axios from 'axios';

const InfluencerDashboard = ({ walletAddress }) => {
  const [profile, setProfile] = useState({
    youtubeChannelId: '',
    youtubeChannelName: '',
    email: ''
  });
  const [registeredCampaigns, setRegisteredCampaigns] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissionForm, setSubmissionForm] = useState({
    campaignId: '',
    youtubeUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [walletAddress]);

  const loadDashboardData = async () => {
    try {
      // Load existing profile data
      try {
        const profileResponse = await axios.get(`http://localhost:3001/api/influencers/${walletAddress}`);
        setProfile({
          youtubeChannelId: profileResponse.data.youtubeChannelId || '',
          youtubeChannelName: profileResponse.data.youtubeChannelName || '',
          email: profileResponse.data.email || ''
        });
      } catch (error) {
        // Profile doesn't exist yet, keep empty form
        console.log('No existing profile found');
      }

      // Load registered campaigns
      const activeCampaigns = await web3Service.getActiveCampaigns();

      const registeredCampaignsPromises = activeCampaigns.map(async (campaignId) => {
        const isRegistered = await web3Service.isInfluencerRegistered(campaignId, walletAddress);
        if (isRegistered) {
          const [campaignInfo, dbInfo] = await Promise.all([
            web3Service.getCampaignInfo(campaignId),
            axios.get(`http://localhost:3001/api/campaigns/${campaignId}`).catch(() => ({ data: null }))
          ]);

          return {
            id: campaignId,
            ...campaignInfo,
            ...dbInfo.data
          };
        }
        return null;
      });

      const registeredCampaignsData = (await Promise.all(registeredCampaignsPromises)).filter(Boolean);
      setRegisteredCampaigns(registeredCampaignsData);

      // Load user's submissions
      if (registeredCampaignsData.length > 0) {
        try {
          const submissionsPromises = registeredCampaignsData.map(async (campaign) => {
            try {
              const response = await axios.get(`http://localhost:3001/api/campaigns/${campaign.id}/submissions`);
              return response.data.filter(submission =>
                submission.wallet_address.toLowerCase() === walletAddress.toLowerCase()
              ).map(submission => ({
                ...submission,
                campaign_title: campaign.title || `Campaign #${campaign.id}`
              }));
            } catch (error) {
              return [];
            }
          });

          const allSubmissions = (await Promise.all(submissionsPromises)).flat();
          setSubmissions(allSubmissions);
        } catch (error) {
          console.error('Error loading submissions:', error);
        }
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/api/influencers', {
        walletAddress,
        youtubeChannelId: profile.youtubeChannelId,
        youtubeChannelName: profile.youtubeChannelName,
        email: profile.email
      });
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleSubmissionSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await axios.post('http://localhost:3001/api/submissions', {
        campaignId: submissionForm.campaignId,
        walletAddress,
        youtubeUrl: submissionForm.youtubeUrl
      });

      alert('Video submitted successfully!');
      setSubmissionForm({ campaignId: '', youtubeUrl: '' });

      const newSubmission = {
        ...response.data,
        campaign_title: registeredCampaigns.find(c => c.id == submissionForm.campaignId)?.title || `Campaign #${submissionForm.campaignId}`
      };
      setSubmissions(prev => [newSubmission, ...prev]);

    } catch (error) {
      console.error('Error submitting video:', error);
      alert(error.response?.data?.error || 'Failed to submit video. Please try again.');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="influencer-dashboard">
      <h2>Influencer Dashboard</h2>

      <div className="dashboard-section">
        <h3>Profile Setup</h3>
        <form onSubmit={handleProfileSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="youtubeChannelName">YouTube Channel Name *</label>
            <input
              type="text"
              id="youtubeChannelName"
              value={profile.youtubeChannelName}
              onChange={(e) => setProfile({...profile, youtubeChannelName: e.target.value})}
              required
              placeholder="Your channel name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="youtubeChannelId">YouTube Channel ID *</label>
            <input
              type="text"
              id="youtubeChannelId"
              value={profile.youtubeChannelId}
              onChange={(e) => setProfile({...profile, youtubeChannelId: e.target.value})}
              required
              placeholder="UCxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <small>Find your Channel ID in YouTube Studio → Settings → Channel → Advanced settings</small>
          </div>

          <div className="form-group">
            <label htmlFor="email">Contact Email</label>
            <input
              type="email"
              id="email"
              value={profile.email}
              onChange={(e) => setProfile({...profile, email: e.target.value})}
              placeholder="your@email.com"
            />
          </div>

          <button type="submit" className="save-profile-btn">
            Save Profile
          </button>
        </form>
      </div>

      {registeredCampaigns.length > 0 && (
        <div className="dashboard-section">
          <h3>Submit Video</h3>
          <form onSubmit={handleSubmissionSubmit} className="submission-form">
            <div className="form-group">
              <label htmlFor="campaignSelect">Select Campaign *</label>
              <select
                id="campaignSelect"
                value={submissionForm.campaignId}
                onChange={(e) => setSubmissionForm({...submissionForm, campaignId: e.target.value})}
                required
              >
                <option value="">Choose a campaign...</option>
                {registeredCampaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title || `Campaign #${campaign.id}`} - {campaign.totalReward} ETH
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="youtubeUrl">YouTube Video URL *</label>
              <input
                type="url"
                id="youtubeUrl"
                value={submissionForm.youtubeUrl}
                onChange={(e) => setSubmissionForm({...submissionForm, youtubeUrl: e.target.value})}
                required
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="submit-video-btn"
            >
              {submitting ? 'Submitting...' : 'Submit Video'}
            </button>
          </form>
        </div>
      )}

      <div className="dashboard-section">
        <h3>My Registered Campaigns</h3>
        {registeredCampaigns.length === 0 ? (
          <p>You haven't registered for any campaigns yet. Browse campaigns to get started!</p>
        ) : (
          <div className="campaign-cards">
            {registeredCampaigns.map((campaign) => (
              <div key={campaign.id} className="campaign-card">
                <h4 className='campaign-title'>{campaign.title || `Campaign #${campaign.id}`}</h4>
                <p className="description">{campaign.description}</p>
                <div className="campaign-stats">
                  <span><strong>Reward:</strong> {campaign.totalReward} ETH</span>
                  <span><strong>Participants:</strong> {campaign.influencerCount}</span>
                </div>
                <div className="campaign-dates">
                  <p><strong>Registration Ends:</strong> {formatDate(campaign.registrationEnd)}</p>
                  <p><strong>Campaign Ends:</strong> {formatDate(campaign.campaignEnd)}</p>
                </div>
                <div className="requirements">
                  <strong>Requirements:</strong>
                  <p>{campaign.requirements}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {submissions.length > 0 && (
        <div className="dashboard-section">
          <h3>My Submissions</h3>
          <div className="submissions-grid">
            {submissions.map((submission) => (
              <div key={submission.id} className="submission-card">
                <a
                  href={submission.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="video-link"
                >
                  <div className="video-thumbnail">
                    {submission.youtubeVideoId ? (
                      <img
                        src={`https://img.youtube.com/vi/${submission.youtubeVideoId}/mqdefault.jpg`}
                        alt="Video thumbnail"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="no-thumbnail">No Video</div>
                    )}
                  </div>
                </a>
                <div className="submission-info">
                  <h4>{submission.campaign_title}</h4>
                  <div className="stats">
                    <span>👀 {(submission.viewCount || 0).toLocaleString()}</span>
                    <span>👍 {(submission.likeCount || 0).toLocaleString()}</span>
                    <span>💬 {(submission.commentCount || 0).toLocaleString()}</span>
                  </div>
                  <p className="score">Performance Score: {Math.round(submission.performanceScore || 0).toLocaleString()}</p>
                  <p className="submitted-date">Submitted: {formatDate(new Date(submission.createdAt).getTime())}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InfluencerDashboard;