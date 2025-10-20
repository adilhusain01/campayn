import { useState, useEffect } from 'react';
import { web3Service } from '../utils/web3.js';
import axios from 'axios';

const InfluencerDashboard = ({ walletAddress }) => {
  const [profile, setProfile] = useState({
    youtubeChannelId: '',
    youtubeChannelName: '',
    email: '',
    isChannelVerified: false,
    verificationCode: ''
  });
  const [registeredCampaigns, setRegisteredCampaigns] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissionForm, setSubmissionForm] = useState({
    campaignId: '',
    youtubeUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

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
          email: profileResponse.data.email || '',
          isChannelVerified: profileResponse.data.isChannelVerified || false,
          verificationCode: profileResponse.data.verificationCode || ''
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

  const generateVerificationCode = () => {
    const code = 'CAMPAYN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    setProfile({...profile, verificationCode: code});
    setShowVerification(true);
  };

  const handleVerifyChannel = async () => {
    if (!profile.verificationCode) {
      alert('Please generate a verification code first');
      return;
    }

    setVerifying(true);
    try {
      const response = await axios.post('http://localhost:3001/api/influencers/verify-channel', {
        walletAddress,
        youtubeChannelId: profile.youtubeChannelId,
        verificationCode: profile.verificationCode
      });

      setProfile({...profile, isChannelVerified: true});
      setShowVerification(false);
      alert('Channel verified successfully!');
    } catch (error) {
      console.error('Error verifying channel:', error);
      alert(error.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
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
    return <div className="text-center py-12 text-gray-600 text-lg">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-6xl">
      <h2 className="text-3xl font-semibold text-gray-800 mb-8">Influencer Dashboard</h2>

      <div className="mb-12">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-semibold text-gray-800 mb-2 flex items-center justify-center">
            <span className="mr-3">📝</span>
            Profile Setup
          </h3>
          <p className="text-gray-600">Complete your profile to start participating in campaigns</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div>
              <label htmlFor="youtubeChannelName" className="block mb-2 font-semibold text-gray-800 flex items-center">
                <span className="mr-2">🎥</span>
                YouTube Channel Name
              </label>
              <input
                type="text"
                id="youtubeChannelName"
                value={profile.youtubeChannelName}
                onChange={(e) => setProfile({...profile, youtubeChannelName: e.target.value})}
                required
                placeholder="Your channel name"
                className="w-full p-4 border-2 border-white/80 rounded-xl text-base transition-all focus:outline-none focus:border-blue-400 focus:shadow-lg bg-white/80 backdrop-blur-sm"
              />
            </div>

            <div>
              <label htmlFor="youtubeChannelId" className="block mb-2 font-semibold text-gray-800 flex items-center">
                <span className="mr-2">🎯</span>
                YouTube Channel ID
              </label>
              <input
                type="text"
                id="youtubeChannelId"
                value={profile.youtubeChannelId}
                onChange={(e) => setProfile({...profile, youtubeChannelId: e.target.value})}
                required
                placeholder="UCxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full p-4 border-2 border-white/80 rounded-xl text-base transition-all focus:outline-none focus:border-blue-400 focus:shadow-lg bg-white/80 backdrop-blur-sm font-mono"
              />
              <div className="mt-2 p-3 bg-blue-100/50 rounded-lg">
                <div className="text-blue-700 text-sm font-medium flex items-center">
                  <span className="mr-2">📍</span>
                  Find in YouTube Studio → Settings → Channel → Advanced settings
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block mb-2 font-semibold text-gray-800 flex items-center">
                <span className="mr-2">📧</span>
                Contact Email <span className="text-gray-400 text-sm ml-2">(optional)</span>
              </label>
              <input
                type="email"
                id="email"
                value={profile.email}
                onChange={(e) => setProfile({...profile, email: e.target.value})}
                placeholder="your@email.com"
                className="w-full p-4 border-2 border-white/80 rounded-xl text-base transition-all focus:outline-none focus:border-blue-400 focus:shadow-lg bg-white/80 backdrop-blur-sm"
              />
            </div>

          {profile.youtubeChannelId && (
            <div className="mb-6">
              <label className="block mb-2 font-semibold text-gray-800">Channel Verification Status</label>
              <div className="mt-2">
                {profile.isChannelVerified ? (
                  <div className="text-green-600 font-semibold flex items-center gap-2">
                    ✅ Channel Verified
                  </div>
                ) : (
                  <div className="text-red-600 font-semibold flex items-center gap-2">
                    ❌ Channel Not Verified
                    <button
                      type="button"
                      onClick={generateVerificationCode}
                      className="bg-blue-500 text-white border-none py-2 px-4 rounded-md text-sm cursor-pointer transition-colors hover:bg-blue-600 ml-2"
                    >
                      Verify Channel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {showVerification && !profile.isChannelVerified && (
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 mt-4">
              <h4 className="text-gray-800 font-semibold mb-4">Channel Verification</h4>
              <p className="text-gray-700 mb-4">To verify your channel ownership, add this code to your channel banner or latest video description:</p>
              <div className="bg-gray-200 border-2 border-gray-600 rounded-md p-4 my-4 font-mono text-lg text-center tracking-wide">
                <strong>{profile.verificationCode}</strong>
              </div>
              <p className="text-gray-700 mb-4"><em>After adding the code, click "Complete Verification" below.</em></p>
              <button
                type="button"
                onClick={handleVerifyChannel}
                disabled={verifying}
                className="bg-green-600 text-white border-none py-3 px-6 rounded-lg font-semibold cursor-pointer transition-all duration-200 hover:bg-green-700 hover:-translate-y-0.5 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
              >
                {verifying ? 'Verifying...' : 'Complete Verification'}
              </button>
            </div>
          )}

            <div className="pt-4">
              <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none py-4 px-8 rounded-xl font-semibold text-base transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex items-center justify-center">
                <span className="mr-2">💾</span>
                Save Profile
              </button>
            </div>
          </form>
        </div>
      </div>

      {registeredCampaigns.length > 0 && (
        <div className="mb-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold text-gray-800 mb-2 flex items-center justify-center">
              <span className="mr-3">🎬</span>
              Submit Video
            </h3>
            <p className="text-gray-600">Share your campaign video and start earning rewards</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-xl border border-emerald-200">
            <form onSubmit={handleSubmissionSubmit} className="space-y-6">
              <div>
                <label htmlFor="campaignSelect" className="block mb-2 font-semibold text-gray-800 flex items-center">
                  <span className="mr-2">🎯</span>
                  Select Campaign
                </label>
                <select
                  id="campaignSelect"
                  value={submissionForm.campaignId}
                  onChange={(e) => setSubmissionForm({...submissionForm, campaignId: e.target.value})}
                  required
                  className="w-full p-4 border-2 border-white/80 rounded-xl text-base transition-all focus:outline-none focus:border-emerald-400 focus:shadow-lg bg-white/80 backdrop-blur-sm"
                >
                  <option value="">Choose a campaign...</option>
                  {registeredCampaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.title || `Campaign #${campaign.id}`} - {campaign.totalReward} FLOW
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="youtubeUrl" className="block mb-2 font-semibold text-gray-800 flex items-center">
                  <span className="mr-2">🔗</span>
                  YouTube Video URL
                </label>
                <input
                  type="url"
                  id="youtubeUrl"
                  value={submissionForm.youtubeUrl}
                  onChange={(e) => setSubmissionForm({...submissionForm, youtubeUrl: e.target.value})}
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full p-4 border-2 border-white/80 rounded-xl text-base transition-all focus:outline-none focus:border-emerald-400 focus:shadow-lg bg-white/80 backdrop-blur-sm"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white border-none py-4 px-8 rounded-xl font-semibold text-base transition-all duration-300 hover:-translate-y-1 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                >
                  {submitting ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <span className="mr-2">🚀</span>
                      Submit Video
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mb-12">
        <h3 className="text-gray-800 text-xl font-semibold mb-6 pb-2 border-b-2 border-gray-200">My Registered Campaigns</h3>
        {registeredCampaigns.length === 0 ? (
          <p className="text-center py-12 text-gray-600">You haven't registered for any campaigns yet. Browse campaigns to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {registeredCampaigns.map((campaign) => (
              <div key={campaign.id} className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="p-6">
                  <h4 className="text-lg font-bold text-gray-800 mb-2">{campaign.title || `Campaign #${campaign.id}`}</h4>
                  <p className="text-gray-600 mb-4 overflow-hidden line-clamp-2">{campaign.description}</p>
                  <div className="grid grid-cols-2 gap-4 mb-4 text-black">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="block text-lg text-gray-800 font-semibold">{campaign.totalReward} FLOW</div>
                      <div className="text-sm text-gray-600">Reward</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="block text-lg text-gray-800 font-semibold">{campaign.influencerCount}</div>
                      <div className="text-sm text-gray-600">Participants</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    <p className="mb-1"><strong>Registration Ends:</strong> {formatDate(campaign.registrationEnd)}</p>
                    <p><strong>Campaign Ends:</strong> {formatDate(campaign.campaignEnd)}</p>
                  </div>
                  <div className="bg-gray-50 text-gray-600 p-4 rounded-lg border-l-4 border-indigo-500">
                    <strong className="text-gray-800">Requirements:</strong>
                    <p className="mt-2">{campaign.requirements}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {submissions.length > 0 && (
        <div className="mb-12">
          <h3 className="text-gray-800 text-xl font-semibold mb-6 pb-2 border-b-2 border-gray-200">My Submissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {submissions.map((submission) => (
              <div key={submission.id} className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl overflow-hidden shadow-sm border border-rose-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <a
                  href={submission.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative w-full h-40 bg-gray-50 overflow-hidden">
                    {submission.youtubeVideoId ? (
                      <img
                        src={`https://img.youtube.com/vi/${submission.youtubeVideoId}/mqdefault.jpg`}
                        alt="Video thumbnail"
                        onError={(e) => { e.target.style.display = 'none'; }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-600 text-sm border-2 border-dashed border-gray-300">No Video</div>
                    )}
                  </div>
                </a>
                <div className="p-4">
                  <h4 className="text-gray-800 font-semibold text-base mb-2">{submission.campaign_title}</h4>
                  <div className="flex justify-between text-sm text-gray-600 mb-3">
                    <span>👀 {(submission.viewCount || 0).toLocaleString()}</span>
                    <span>👍 {(submission.likeCount || 0).toLocaleString()}</span>
                    <span>💬 {(submission.commentCount || 0).toLocaleString()}</span>
                  </div>
                  <p className="text-indigo-600 font-semibold mb-2">Performance Score: {Math.round(submission.performanceScore || 0).toLocaleString()}</p>
                  <p className="text-gray-600 text-xs">Submitted: {formatDate(new Date(submission.createdAt).getTime())}</p>
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