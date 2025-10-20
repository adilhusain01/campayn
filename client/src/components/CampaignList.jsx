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
    return <div className="text-center py-12 text-gray-600 text-lg">Loading campaigns...</div>;
  }

  if (selectedCampaign) {
    return (
      <div className="max-w-4xl">
        <button
          onClick={() => setSelectedCampaign(null)}
          className="bg-gray-50 text-gray-800 border border-gray-300 py-2 px-4 rounded-lg mb-8 inline-flex items-center gap-2 transition-all duration-200 hover:bg-gray-100 hover:-translate-x-0.5"
        >
          ← Back to Campaigns
        </button>

        <h2 className="text-3xl font-semibold text-gray-800 mb-8">{selectedCampaign.title}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-blue-200">
            <h3 className="text-gray-800 font-semibold text-xl mb-4 border-b border-blue-200 pb-2">Campaign Info</h3>
            <div className="space-y-3">
              <p className="text-gray-600"><strong className="text-gray-800">Description:</strong> {selectedCampaign.description}</p>
              <p className="text-gray-600"><strong className="text-gray-800">Requirements:</strong> {selectedCampaign.requirements}</p>
              <p className="text-gray-600"><strong className="text-gray-800">Total Reward:</strong> {selectedCampaign.totalReward} FLOW</p>
              <p className="text-gray-600"><strong className="text-gray-800">Participants:</strong> {selectedCampaign.influencerCount}</p>
              <p className="text-gray-600"><strong className="text-gray-800">Registration Ends:</strong> {formatDate(selectedCampaign.registrationEnd)}</p>
              <p className="text-gray-600"><strong className="text-gray-800">Campaign Ends:</strong> {formatDate(selectedCampaign.campaignEnd)}</p>
            </div>
          </div>

          {selectedCampaign.leaderboard && selectedCampaign.leaderboard.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-xl shadow-sm border border-emerald-200">
              <h3 className="text-gray-800 font-semibold text-xl mb-4 border-b border-emerald-200 pb-2">Current Leaderboard</h3>
              <div className="max-h-96 overflow-y-auto">
                {selectedCampaign.leaderboard.slice(0, 10).map((submission, index) => (
                  <div key={submission.id} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center py-3 border-b border-gray-50 last:border-b-0">
                    <span className="font-bold text-indigo-600 text-lg">#{index + 1}</span>
                    <span className="text-gray-800">{submission.youtube_channel_name}</span>
                    <span className="font-semibold text-green-600">{Math.round(submission.performanceScore || submission.performance_score || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedCampaign.submissions && selectedCampaign.submissions.length > 0 && (
          <div className="mt-8">
            <h3 className="text-gray-800 font-semibold text-xl mb-6">Recent Submissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedCampaign.submissions.slice(0, 6).map((submission) => (
                <div key={submission.id} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl overflow-hidden shadow-sm border border-purple-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  <a
                    href={submission.youtubeUrl || submission.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="relative w-full h-40 bg-gray-50 overflow-hidden">
                      {(submission.youtubeVideoId || submission.youtube_video_id) ? (
                        <img
                          src={`https://img.youtube.com/vi/${submission.youtubeVideoId || submission.youtube_video_id}/mqdefault.jpg`}
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
                    <p className="font-semibold text-gray-800 mb-3">{submission.youtube_channel_name}</p>
                    <div className="flex justify-between text-sm text-gray-600 mb-3">
                      <span>👀 {(submission.viewCount || submission.view_count || 0).toLocaleString()}</span>
                      <span>👍 {(submission.likeCount || submission.like_count || 0).toLocaleString()}</span>
                      <span>💬 {(submission.commentCount || submission.comment_count || 0).toLocaleString()}</span>
                    </div>
                    <p className="font-semibold text-indigo-600">Score: {Math.round(submission.performanceScore || submission.performance_score || 0).toLocaleString()}</p>
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
    <div>
      <h2 className="text-3xl font-semibold text-gray-800 mb-8">Active Campaigns</h2>

      {campaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <p className="mb-2">No active campaigns found.</p>
          <p>Check back later or create your own campaign!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => {
            const status = getStatusBadge(campaign);
            const statusClasses = {
              'status-open': 'bg-green-50 text-green-700',
              'status-active': 'bg-yellow-50 text-yellow-700',
              'status-ended': 'bg-red-50 text-red-700'
            };
            return (
              <div key={campaign.id} className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="p-6 border-b border-gray-50 flex justify-between items-start gap-4">
                  <h3 className="text-lg font-semibold text-gray-800 leading-tight">{campaign.title || `Campaign #${campaign.id}`}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${statusClasses[status.class]}`}>
                    {status.text}
                  </span>
                </div>

                <div className="p-6">
                  <p className="text-gray-600 mb-4 overflow-hidden line-clamp-2">
                    {campaign.description || 'No description available'}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-black">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="block text-lg font-semibold text-gray-800">{campaign.totalReward} FLOW</div>
                      <div className="text-sm text-gray-600">Total Reward</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="block text-lg font-semibold text-gray-800">{campaign.influencerCount}</div>
                      <div className="text-sm text-gray-600">Participants</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-6">
                    <p className="mb-1"><strong>Registration:</strong> {formatDate(campaign.registrationEnd)}</p>
                    <p><strong>Campaign End:</strong> {formatDate(campaign.campaignEnd)}</p>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-50 flex gap-3">
                  <button
                    onClick={() => viewCampaignDetails(campaign)}
                    className="flex-1 py-3 px-4 bg-gray-50 text-gray-800 border border-gray-300 rounded-lg font-semibold transition-colors hover:bg-gray-100"
                  >
                    View Details
                  </button>

                  {Date.now() < campaign.registrationEnd && (
                    <button
                      onClick={() => handleRegister(campaign.id)}
                      disabled={registering[campaign.id]}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
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