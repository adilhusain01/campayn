import { useState, useEffect } from 'react';
import { web3Service } from '../utils/web3.js';
import { toast } from 'sonner';
import api from '../utils/api.js';

const CampaignList = ({ walletAddress }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [registering, setRegistering] = useState({});
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [registeredCampaigns, setRegisteredCampaigns] = useState(new Set());

  useEffect(() => {
    loadCampaigns();
    loadVerificationStatus();
  }, [walletAddress]);

  const loadVerificationStatus = async () => {
    if (!walletAddress) return;

    try {
      const response = await api.get(`/api/influencers/${walletAddress}/verification-status`);
      setVerificationStatus(response.data);
    } catch (error) {
      console.error('Error loading verification status:', error);
      setVerificationStatus({ canRegisterForCampaigns: false, isVerified: false, hasProfile: false });
    }
  };

  const loadCampaigns = async () => {
    try {
      const activeCampaignIds = await web3Service.getActiveCampaigns();

      const campaignPromises = activeCampaignIds.map(async (id) => {
        const [blockchainInfo, dbInfo] = await Promise.all([
          web3Service.getCampaignInfo(id),
          api.get(`/api/campaigns/${id}`).catch(() => ({ data: null }))
        ]);

        return {
          id,
          ...blockchainInfo,
          ...dbInfo.data
        };
      });

      const campaignData = await Promise.all(campaignPromises);
      setCampaigns(campaignData);

      // Check registration status for each campaign
      if (walletAddress && campaignData.length > 0) {
        const registrationPromises = campaignData.map(async (campaign) => {
          try {
            const isRegistered = await web3Service.isInfluencerRegistered(campaign.id, walletAddress);
            return { campaignId: campaign.id, isRegistered };
          } catch (error) {
            console.error(`Error checking registration for campaign ${campaign.id}:`, error);
            return { campaignId: campaign.id, isRegistered: false };
          }
        });

        const registrationResults = await Promise.all(registrationPromises);
        const registeredSet = new Set();

        registrationResults.forEach(({ campaignId, isRegistered }) => {
          if (isRegistered) {
            registeredSet.add(campaignId);
          }
        });

        setRegisteredCampaigns(registeredSet);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (campaignId) => {
    setRegistering({ ...registering, [campaignId]: true });

    try {
      // First check if influencer is verified
      const verificationResponse = await api.get(`/api/influencers/${walletAddress}/verification-status`);
      const verificationData = verificationResponse.data;

      if (!verificationData.hasProfile) {
        toast.error('Profile Required!', {
          description: 'You need to complete your influencer profile first. Go to the Influencer Dashboard to set up your profile.',
          duration: 8000,
        });
        setRegistering({ ...registering, [campaignId]: false });
        return;
      }

      if (!verificationData.hasRequiredFields) {
        toast.error('Profile Incomplete!', {
          description: 'Please complete your YouTube Channel ID and Channel Name in your profile before registering.',
          duration: 8000,
        });
        setRegistering({ ...registering, [campaignId]: false });
        return;
      }

      if (!verificationData.isVerified) {
        toast.error('Channel Verification Required!', {
          description: 'You must verify your YouTube channel before registering for campaigns. Complete verification in the Influencer Dashboard.',
          duration: 8000,
        });
        setRegistering({ ...registering, [campaignId]: false });
        return;
      }

      // If all checks pass, proceed with blockchain registration
      await web3Service.registerInfluencer(campaignId);

      // Update registered campaigns state
      setRegisteredCampaigns(prev => new Set([...prev, campaignId]));

      toast.success('Registration Successful!', {
        description: 'You have successfully registered for the campaign. You can now submit videos!',
        duration: 6000,
      });
      loadCampaigns();
    } catch (error) {
      console.error('Error registering:', error);

      // Check for specific error types
      if (error.message && error.message.includes('Influencer already registered')) {
        toast.error('Already Registered!', {
          description: 'You are already registered for this campaign. Check your Influencer Dashboard to submit videos.',
          duration: 6000,
        });
      } else if (error.message && error.message.includes('user rejected')) {
        toast.error('Transaction Cancelled', {
          description: 'You cancelled the registration transaction.',
          duration: 4000,
        });
      } else if (error.message && error.message.includes('insufficient funds')) {
        toast.error('Insufficient Funds', {
          description: 'You need more STT to cover the transaction gas fees.',
          duration: 5000,
        });
      } else if (error.message && error.message.includes('Registration period has ended')) {
        toast.error('Registration Closed', {
          description: 'The registration period for this campaign has ended.',
          duration: 5000,
        });
      } else {
        toast.error('Registration Failed', {
          description: 'Failed to register for the campaign. Please try again.',
          duration: 5000,
        });
      }
    } finally {
      setRegistering({ ...registering, [campaignId]: false });
    }
  };

  const viewCampaignDetails = async (campaign) => {
    try {
      const [submissions, leaderboard] = await Promise.all([
        api.get(`/api/campaigns/${campaign.id}/submissions`),
        api.get(`/api/campaigns/${campaign.id}/leaderboard`)
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
    return (
      <div className="text-center py-12 text-black text-lg font-black" style={{
        fontFamily: "'Orbitron', monospace",
        textTransform: 'uppercase'
      }}>
        <div className="w-8 h-8 border-2 border-black border-t-transparent animate-spin mx-auto mb-4" style={{
          borderRadius: 0
        }}></div>
        LOADING CAMPAIGNS...
      </div>
    );
  }

  if (selectedCampaign) {
    return (
      <div className="max-w-4xl">
        <button
          onClick={() => setSelectedCampaign(null)}
          className="pixel-button py-3 px-6 mb-8 inline-flex items-center gap-2 font-black transition-all duration-100" style={{
            fontFamily: "'Orbitron', monospace",
            textTransform: 'uppercase'
          }}
        >
          ◀ BACK TO CAMPAIGNS
        </button>

        <h2 className="text-4xl font-black text-black mb-8 pixel-text-shadow" style={{
          fontFamily: "'Orbitron', monospace",
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>{selectedCampaign.title}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 pixel-border pixel-shadow" style={{
            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
          }}>
            <h3 className="text-black font-black text-xl mb-4 border-b-2 border-black pb-2" style={{
              fontFamily: "'Orbitron', monospace",
              textTransform: 'uppercase'
            }}>▲ CAMPAIGN INFO</h3>
            <div className="space-y-3 font-bold" style={{
              fontFamily: "'Orbitron', monospace"
            }}>
              <p className="text-black"><span className="font-black">► DESCRIPTION:</span> {selectedCampaign.description}</p>
              <p className="text-black"><span className="font-black">► REQUIREMENTS:</span> {selectedCampaign.requirements}</p>
              <p className="text-black"><span className="font-black">► TOTAL REWARD:</span> {selectedCampaign.totalReward} STT</p>
              <p className="text-black"><span className="font-black">► PARTICIPANTS:</span> {selectedCampaign.influencerCount}</p>
              <p className="text-black"><span className="font-black">► REGISTRATION ENDS:</span> {formatDate(selectedCampaign.registrationEnd)}</p>
              <p className="text-black"><span className="font-black">► CAMPAIGN ENDS:</span> {formatDate(selectedCampaign.campaignEnd)}</p>
            </div>
          </div>

          {selectedCampaign.leaderboard && selectedCampaign.leaderboard.length > 0 && (
            <div className="bg-white p-6 pixel-border pixel-shadow" style={{
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
            }}>
              <h3 className="text-black font-black text-xl mb-4 border-b-2 border-black pb-2" style={{
                fontFamily: "'Orbitron', monospace",
                textTransform: 'uppercase'
              }}>🏆 CURRENT LEADERBOARD</h3>
              <div className="max-h-96 overflow-y-auto">
                {selectedCampaign.leaderboard.slice(0, 10).map((submission, index) => (
                  <div key={submission.id} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center py-3 border-b-2 border-black last:border-b-0">
                    <span className="font-black text-black text-lg" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>#{index + 1}</span>
                    <span className="text-black font-bold" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>{submission.youtube_channel_name}</span>
                    <span className="font-black text-black" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>{Math.round(submission.performanceScore || submission.performance_score || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedCampaign.submissions && selectedCampaign.submissions.length > 0 && (
          <div className="mt-8">
            <h3 className="text-black font-black text-xl mb-6" style={{
              fontFamily: "'Orbitron', monospace",
              textTransform: 'uppercase'
            }}>◆ RECENT SUBMISSIONS</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedCampaign.submissions.slice(0, 6).map((submission) => (
                <div key={submission.id} className="bg-white overflow-hidden pixel-border pixel-shadow transition-all duration-100 hover:-translate-y-1" style={{
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                }}>
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
                        <div className="w-full h-full bg-white flex items-center justify-center text-black text-sm border-2 border-black font-bold" style={{
                          fontFamily: "'Orbitron', monospace"
                        }}>NO VIDEO</div>
                      )}
                    </div>
                  </a>
                  <div className="p-4">
                    <p className="font-black text-black mb-3" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>{submission.youtube_channel_name}</p>
                    <div className="flex justify-between text-sm text-black mb-3 font-bold" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>
                      <span>► {(submission.viewCount || submission.view_count || 0).toLocaleString()}</span>
                      <span>▲ {(submission.likeCount || submission.like_count || 0).toLocaleString()}</span>
                      <span>◆ {(submission.commentCount || submission.comment_count || 0).toLocaleString()}</span>
                    </div>
                    <p className="font-black text-black" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>SCORE: {Math.round(submission.performanceScore || submission.performance_score || 0).toLocaleString()}</p>
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
      <h2 className="text-4xl font-black text-black mb-8 pixel-text-shadow" style={{
        fontFamily: "'Orbitron', monospace",
        textTransform: 'uppercase',
        letterSpacing: '2px'
      }}>▶ ACTIVE CAMPAIGNS</h2>

      {/* Verification Status Banner */}
      {verificationStatus && !verificationStatus.canRegisterForCampaigns && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-6 mb-8 pixel-border" style={{
          clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
        }}>
          <h3 className="text-black font-black mb-3 flex items-center" style={{
            fontFamily: "'Orbitron', monospace",
            textTransform: 'uppercase'
          }}>
            <span className="mr-2">⚠</span>
            CAMPAIGN REGISTRATION REQUIREMENTS
          </h3>
          <div className="text-black font-bold" style={{
            fontFamily: "'Orbitron', monospace"
          }}>
            {!verificationStatus.hasProfile ? (
              <p>► You need to create your influencer profile first. Go to the Influencer Dashboard to get started.</p>
            ) : !verificationStatus.hasRequiredFields ? (
              <p>► Please complete your YouTube Channel ID and Channel Name in your profile.</p>
            ) : !verificationStatus.isVerified ? (
              <p>► You must verify your YouTube channel ownership before registering for campaigns. Complete verification in the Influencer Dashboard.</p>
            ) : (
              <p>► Complete all requirements in the Influencer Dashboard to register for campaigns.</p>
            )}
          </div>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="text-center py-12 text-black font-bold" style={{
          fontFamily: "'Orbitron', monospace",
          textTransform: 'uppercase'
        }}>
          <p className="mb-2">NO ACTIVE CAMPAIGNS FOUND.</p>
          <p>CHECK BACK LATER OR CREATE YOUR OWN CAMPAIGN!</p>
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
              <div key={campaign.id} className="bg-white overflow-hidden pixel-border pixel-shadow transition-all duration-100 hover:-translate-y-1" style={{
                clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
              }}>
                <div className="p-6 border-b-2 border-black flex justify-between items-start gap-4">
                  <h3 className="text-lg font-black text-black leading-tight" style={{
                    fontFamily: "'Orbitron', monospace",
                    textTransform: 'uppercase'
                  }}>{campaign.title || `CAMPAIGN #${campaign.id}`}</h3>
                  <span className="px-3 py-1 pixel-border text-sm font-black whitespace-nowrap bg-white text-black" style={{
                    fontFamily: "'Orbitron', monospace",
                    textTransform: 'uppercase'
                  }}>
                    {status.text.toUpperCase()}
                  </span>
                </div>

                <div className="p-6">
                  <p className="text-black mb-4 overflow-hidden line-clamp-2 font-bold" style={{
                    fontFamily: "'Orbitron', monospace"
                  }}>
                    {campaign.description || 'NO DESCRIPTION AVAILABLE'}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-black">
                    <div className="text-center p-3 bg-black text-white pixel-border">
                      <div className="block text-lg font-black" style={{
                        fontFamily: "'Orbitron', monospace"
                      }}>{campaign.totalReward} STT</div>
                      <div className="text-sm font-bold" style={{
                        fontFamily: "'Orbitron', monospace"
                      }}>TOTAL REWARD</div>
                    </div>
                    <div className="text-center p-3 bg-black text-white pixel-border">
                      <div className="block text-lg font-black" style={{
                        fontFamily: "'Orbitron', monospace"
                      }}>{campaign.influencerCount}</div>
                      <div className="text-sm font-bold" style={{
                        fontFamily: "'Orbitron', monospace"
                      }}>PARTICIPANTS</div>
                    </div>
                  </div>

                  <div className="text-sm text-black mb-6 font-bold" style={{
                    fontFamily: "'Orbitron', monospace"
                  }}>
                    <p className="mb-1"><span className="font-black">► REGISTRATION:</span> {formatDate(campaign.registrationEnd)}</p>
                    <p><span className="font-black">► CAMPAIGN END:</span> {formatDate(campaign.campaignEnd)}</p>
                  </div>
                </div>

                <div className="p-6 border-t-2 border-black flex gap-3">
                  <button
                    onClick={() => viewCampaignDetails(campaign)}
                    className="flex-1 py-3 px-4 bg-white text-black border-2 border-black font-black transition-all duration-100 hover:bg-black hover:text-white" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}
                  >
                    ▶ VIEW DETAILS
                  </button>

                  {/* Registration Status Section */}
                  {registeredCampaigns.has(campaign.id) ? (
                    // Already registered - show status
                    <div className="flex-1 py-3 px-4 bg-green-50 border-2 border-green-400 text-green-700 font-black text-center" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}>
                      ✓ REGISTERED
                    </div>
                  ) : Date.now() < campaign.registrationEnd ? (
                    <>
                      {/* Show verification requirements if not verified */}
                      {verificationStatus && !verificationStatus.canRegisterForCampaigns ? (
                        <div className="flex-1 py-3 px-4 bg-red-50 border-2 border-red-300 text-red-700 font-black text-center" style={{
                          fontFamily: "'Orbitron', monospace",
                          textTransform: 'uppercase'
                        }}>
                          {!verificationStatus.hasProfile ? '⚠ PROFILE REQUIRED' :
                           !verificationStatus.hasRequiredFields ? '⚠ COMPLETE PROFILE' :
                           !verificationStatus.isVerified ? '⚠ VERIFY CHANNEL' : '⚠ VERIFICATION NEEDED'}
                        </div>
                      ) : (
                        /* Show registration button only if verified and not registered */
                        <button
                          onClick={() => handleRegister(campaign.id)}
                          disabled={registering[campaign.id]}
                          className="flex-1 py-3 px-4 pixel-button font-black transition-all duration-100 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none" style={{
                            fontFamily: "'Orbitron', monospace",
                            textTransform: 'uppercase'
                          }}
                        >
                          {registering[campaign.id] ? (
                            <span className="flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin mr-2" style={{
                                borderRadius: 0
                              }}></div>
                              REGISTERING...
                            </span>
                          ) : (
                            '★ REGISTER'
                          )}
                        </button>
                      )}
                    </>
                  ) : (
                    // Registration period ended
                    <div className="flex-1 py-3 px-4 bg-gray-50 border-2 border-gray-300 text-gray-600 font-black text-center" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}>
                      REGISTRATION CLOSED
                    </div>
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