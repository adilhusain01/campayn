import { useState, useEffect } from 'react';
import { web3Service } from '../utils/web3.js';
import api from '../utils/api.js';
import DatePicker from 'react-datepicker';
import { toast } from 'sonner';
import "react-datepicker/dist/react-datepicker.css";

const CreateCampaign = ({ walletAddress }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    rewardAmount: '0.1'
  });

  // AI Verification settings
  const [aiSettings, setAiSettings] = useState({
    enabled: true,
    minimumWordCount: 50,
    requiredKeywords: [],
    strictMode: false
  });

  // Separate state for date/time selections
  const [registrationEndDate, setRegistrationEndDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // Default: 3 days from now
  );
  const [campaignEndDate, setCampaignEndDate] = useState(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // Default: 10 days from now
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Create portal container if it doesn't exist
    if (!document.getElementById('react-datepicker-portal')) {
      const portalDiv = document.createElement('div');
      portalDiv.id = 'react-datepicker-portal';
      portalDiv.style.zIndex = '9999';
      document.body.appendChild(portalDiv);
    }
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateDates = () => {
    const now = new Date();
    const errors = [];

    // Registration end must be in the future
    if (registrationEndDate <= now) {
      errors.push('Registration end date must be in the future');
    }

    // Campaign end must be after registration end
    if (campaignEndDate <= registrationEndDate) {
      errors.push('Campaign end date must be after registration end date');
    }

    // Minimum registration period (1 hour)
    const minRegistrationTime = new Date(now.getTime() + 60 * 60 * 1000);
    if (registrationEndDate < minRegistrationTime) {
      errors.push('Registration period must be at least 1 hour from now');
    }

    // Minimum campaign duration (1 hour after registration ends)
    const minCampaignTime = new Date(registrationEndDate.getTime() + 60 * 60 * 1000);
    if (campaignEndDate < minCampaignTime) {
      errors.push('Campaign must run for at least 1 hour after registration ends');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    // Validate dates first
    const dateErrors = validateDates();
    if (dateErrors.length > 0) {
      toast.error('Invalid Dates', {
        description: dateErrors.join('. '),
        duration: 6000,
      });
      setLoading(false);
      return;
    }

    try {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      const registrationEndTimestamp = Math.floor(registrationEndDate.getTime() / 1000);
      const campaignEndTimestamp = Math.floor(campaignEndDate.getTime() / 1000);

      // Calculate durations from now
      const registrationDuration = registrationEndTimestamp - now;
      const totalDuration = campaignEndTimestamp - now;

      const result = await web3Service.createCampaign(
        registrationDuration,
        totalDuration, // Total campaign duration from now
        formData.rewardAmount
      );

      await api.post('/api/campaigns', {
        blockchainId: result.campaignId,
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        aiVerification: aiSettings
      });

      setSuccess(`Campaign created successfully! Campaign ID: ${result.campaignId}`);

      toast.success('Campaign Created!', {
        description: `Your campaign "${formData.title}" has been launched successfully with ${formData.rewardAmount} STT in rewards.`,
        duration: 6000,
      });

      setFormData({
        title: '',
        description: '',
        requirements: '',
        rewardAmount: '0.1'
      });

      // Reset dates and AI settings to defaults
      setRegistrationEndDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
      setCampaignEndDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));
      setAiSettings({
        enabled: true,
        minimumWordCount: 50,
        requiredKeywords: [],
        strictMode: false
      });

    } catch (error) {
      console.error('Error creating campaign:', error);

      // Check for specific error types
      if (error.message && error.message.includes('insufficient funds')) {
        toast.error('Insufficient Funds', {
          description: `You need ${formData.rewardAmount} STT to create this campaign. Please add more STT to your wallet.`,
          duration: 6000,
        });
      } else if (error.message && error.message.includes('user rejected')) {
        toast.error('Transaction Cancelled', {
          description: 'You cancelled the transaction. No funds were transferred.',
          duration: 4000,
        });
      } else if (error.message && error.message.includes('network')) {
        toast.error('Network Error', {
          description: 'Network connection issue. Please check your internet connection and try again.',
          duration: 5000,
        });
      } else {
        toast.error('Campaign Creation Failed', {
          description: 'Something went wrong while creating your campaign. Please try again.',
          duration: 5000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black mb-6 pixel-text-shadow" style={{
          fontFamily: "'Orbitron', monospace",
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>★ CREATE NEW CAMPAIGN</h2>
        <p className="text-black font-bold text-lg" style={{
          fontFamily: "'Orbitron', monospace",
          textTransform: 'uppercase'
        }}>LAUNCH YOUR PIXEL CAMPAIGN IN SIMPLE STEPS</p>
      </div>

      {success && (
        <div className="bg-white text-black p-4 mb-6 pixel-border pixel-shadow" style={{
          fontFamily: "'Orbitron', monospace",
          fontWeight: 'bold'
        }}>
          ► {success}
        </div>
      )}

      <div className="space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Basic Information */}
        <div className="bg-white p-6 pixel-border pixel-shadow" style={{
          clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))'
        }}>
          <h3 className="text-xl font-black text-black mb-6 flex items-center" style={{
            fontFamily: "'Orbitron', monospace",
            textTransform: 'uppercase'
          }}>
            <span className="bg-black text-white w-8 h-8 flex items-center justify-center text-sm font-black mr-3 pixel-border" style={{
              fontFamily: "'Orbitron', monospace"
            }}>1</span>
            ▲ CAMPAIGN DETAILS
          </h3>
            <div>
              <label htmlFor="title" className="block mb-2 font-black text-black" style={{
                fontFamily: "'Orbitron', monospace",
                textTransform: 'uppercase'
              }}>► CAMPAIGN TITLE</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="IPHONE 17 PRO REVIEW CAMPAIGN"
                className="w-full p-4 border-3 border-black text-base transition-all focus:outline-none bg-white font-bold" style={{
                  fontFamily: "'Orbitron', monospace"
                }}
              />
            </div>

            <div>
              <label htmlFor="description" className="block mb-2 font-black text-black" style={{
                fontFamily: "'Orbitron', monospace",
                textTransform: 'uppercase'
              }}>► DESCRIPTION</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows="3"
                placeholder="DESCRIBE YOUR CAMPAIGN OBJECTIVES AND BRAND MESSAGE..."
                className="w-full p-4 border-3 border-black text-base transition-all focus:outline-none bg-white font-bold resize-none" style={{
                  fontFamily: "'Orbitron', monospace"
                }}
              />
            </div>

            <div>
              <label htmlFor="requirements" className="block mb-2 font-black text-black" style={{
                fontFamily: "'Orbitron', monospace",
                textTransform: 'uppercase'
              }}>► REQUIREMENTS</label>
              <textarea
                id="requirements"
                name="requirements"
                value={formData.requirements}
                onChange={handleInputChange}
                required
                rows="3"
                placeholder="SPECIFIC REQUIREMENTS FOR INFLUENCERS (E.G., MINIMUM SUBSCRIBERS, CONTENT GUIDELINES, HASHTAGS...)"
                className="w-full p-4 border-3 border-black text-base transition-all focus:outline-none bg-white font-bold resize-none" style={{
                  fontFamily: "'Orbitron', monospace"
                }}
              />
            </div>
            </div>

          {/* Step 2: Timing */}
          <div className="bg-white p-6 pixel-border pixel-shadow" style={{
            clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))'
          }}>
            <h3 className="text-xl font-black text-black mb-6 flex items-center" style={{
              fontFamily: "'Orbitron', monospace",
              textTransform: 'uppercase'
            }}>
              <span className="bg-black text-white w-8 h-8 flex items-center justify-center text-sm font-black mr-3 pixel-border" style={{
                fontFamily: "'Orbitron', monospace"
              }}>2</span>
              ⏰ CAMPAIGN TIMELINE
            </h3>
            <div className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="registrationEnd" className="block mb-2 font-black text-black" style={{
                    fontFamily: "'Orbitron', monospace",
                    textTransform: 'uppercase'
                  }}>► REGISTRATION DEADLINE</label>
                  <DatePicker
                    id="registrationEnd"
                    selected={registrationEndDate}
                    onChange={(date) => setRegistrationEndDate(date)}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    timeCaption="Time"
                    dateFormat="MMMM d, yyyy h:mm aa"
                    minDate={new Date(Date.now() + 60 * 60 * 1000)}
                    placeholderText="SELECT REGISTRATION DEADLINE"
                    required
                    className="w-full p-4 border-3 border-black text-base transition-all focus:outline-none bg-white font-bold" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}
                    portalId="react-datepicker-portal"
                  />
                  <div className="mt-2 text-black text-sm font-black" style={{
                    fontFamily: "'Orbitron', monospace"
                  }}>⏰ AT LEAST 1 HOUR FROM NOW</div>
                </div>

                <div>
                  <label htmlFor="campaignEnd" className="block mb-2 font-black text-black" style={{
                    fontFamily: "'Orbitron', monospace",
                    textTransform: 'uppercase'
                  }}>► CAMPAIGN END DATE</label>
                  <DatePicker
                    id="campaignEnd"
                    selected={campaignEndDate}
                    onChange={(date) => setCampaignEndDate(date)}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    timeCaption="Time"
                    dateFormat="MMMM d, yyyy h:mm aa"
                    minDate={new Date(registrationEndDate.getTime() + 60 * 60 * 1000)}
                    placeholderText="SELECT CAMPAIGN END DATE"
                    required
                    className="w-full p-4 border-3 border-black text-base transition-all focus:outline-none bg-white font-bold" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}
                    portalId="react-datepicker-portal"
                  />
                  <div className="mt-2 text-black text-sm font-black" style={{
                    fontFamily: "'Orbitron', monospace"
                  }}>🏁 AT LEAST 1 HOUR AFTER REGISTRATION</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Rewards */}
          <div className="bg-white p-6 pixel-border pixel-shadow" style={{
            clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))'
          }}>
            <h3 className="text-xl font-black text-black mb-6 flex items-center" style={{
              fontFamily: "'Orbitron', monospace",
              textTransform: 'uppercase'
            }}>
              <span className="bg-black text-white w-8 h-8 flex items-center justify-center text-sm font-black mr-3 pixel-border" style={{
                fontFamily: "'Orbitron', monospace"
              }}>3</span>
              💰 REWARDS & LAUNCH
            </h3>
            <div className="space-y-6">

              <div>
                <label htmlFor="rewardAmount" className="block mb-2 font-black text-black" style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}>► TOTAL REWARD (STT)</label>
                <div className="relative">
                  <input
                    type="number"
                    id="rewardAmount"
                    name="rewardAmount"
                    value={formData.rewardAmount}
                    onChange={handleInputChange}
                    min="0.0001"
                    step="0.0001"
                    required
                    placeholder="0.1"
                    className="w-full p-4 pl-12 border-3 border-black text-base transition-all focus:outline-none bg-white font-bold" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}
                  />
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black font-black" style={{
                    fontFamily: "'Orbitron', monospace"
                  }}>▶</span>
                </div>
                <div className="mt-3 p-3 bg-black text-white pixel-border">
                  <div className="text-sm text-white mb-2 font-black" style={{
                    fontFamily: "'Orbitron', monospace",
                    textTransform: 'uppercase'
                  }}>💰 REWARD DISTRIBUTION:</div>
                  <div className="flex justify-between text-sm font-bold" style={{
                    fontFamily: "'Orbitron', monospace"
                  }}>
                    <span className="text-yellow-400">🥇 1ST: 50%</span>
                    <span className="text-gray-300">🥈 2ND: 30%</span>
                    <span className="text-orange-400">🥉 3RD: 20%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: AI Content Verification */}
          <div className="bg-white p-6 pixel-border pixel-shadow" style={{
            clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))'
          }}>
            <h3 className="text-xl font-black text-black mb-6 flex items-center" style={{
              fontFamily: "'Orbitron', monospace",
              textTransform: 'uppercase'
            }}>
              <span className="bg-black text-white w-8 h-8 flex items-center justify-center text-sm font-black mr-3 pixel-border" style={{
                fontFamily: "'Orbitron', monospace"
              }}>4</span>
              🤖 AI CONTENT VERIFICATION
            </h3>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 pixel-border border-blue-600">
                <h4 className="font-black mb-2" style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}>🧠 WHAT IS AI VERIFICATION?</h4>
                <p className="font-bold text-sm" style={{
                  fontFamily: "'Orbitron', monospace"
                }}>
                  AI automatically analyzes video transcripts to ensure influencers actually mention your brand/product and follow campaign requirements. This prevents fake submissions and ensures genuine promotional content.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="aiEnabled"
                  checked={aiSettings.enabled}
                  onChange={(e) => setAiSettings({...aiSettings, enabled: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="aiEnabled" className="font-black text-black" style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}>
                  ENABLE AI CONTENT VERIFICATION
                </label>
              </div>

              {aiSettings.enabled && (
                <div className="space-y-4 bg-gray-50 p-4 pixel-border">
                  <div>
                    <label className="block mb-2 font-black text-black" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}>► MINIMUM WORDS FOR PROMOTIONAL CONTENT</label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={aiSettings.minimumWordCount}
                      onChange={(e) => setAiSettings({...aiSettings, minimumWordCount: parseInt(e.target.value)})}
                      className="w-32 p-2 border-2 border-black font-bold" style={{
                        fontFamily: "'Orbitron', monospace"
                      }}
                    />
                    <div className="mt-1 text-sm font-bold text-gray-600" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>
                      RECOMMENDED: 50-200 WORDS FOR EFFECTIVE PROMOTION
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 font-black text-black" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}>► REQUIRED KEYWORDS (OPTIONAL)</label>
                    <input
                      type="text"
                      value={aiSettings.requiredKeywords.join(', ')}
                      onChange={(e) => setAiSettings({
                        ...aiSettings,
                        requiredKeywords: e.target.value ? e.target.value.split(',').map(k => k.trim()) : []
                      })}
                      placeholder="BRAND NAME, PRODUCT, FEATURE (COMMA SEPARATED)"
                      className="w-full p-3 border-2 border-black font-bold" style={{
                        fontFamily: "'Orbitron', monospace"
                      }}
                    />
                    <div className="mt-1 text-sm font-bold text-gray-600" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>
                      LEAVE EMPTY TO LET AI DETECT BRAND MENTIONS AUTOMATICALLY
                    </div>
                  </div>

                  {/* <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="strictMode"
                      checked={aiSettings.strictMode}
                      onChange={(e) => setAiSettings({...aiSettings, strictMode: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <label htmlFor="strictMode" className="font-black text-black" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}>
                      🔒 STRICT MODE (HIGHER STANDARDS)
                    </label>
                  </div> */}

                  <div className="bg-yellow-50 p-3 pixel-border border-yellow-600">
                    <div className="text-sm font-bold" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>
                      💡 <strong>TIP:</strong> AI verification runs automatically when influencers submit videos.
                      Only approved content will be eligible for rewards. Rejected submissions can be reviewed and re-submitted.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 5: Campaign Summary & Actions */}
          <div className="bg-white p-6 pixel-border pixel-shadow" style={{
            clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))'
          }}>
            <h3 className="text-xl font-black text-black mb-6 flex items-center" style={{
              fontFamily: "'Orbitron', monospace",
              textTransform: 'uppercase'
            }}>
              <span className="bg-black text-white w-8 h-8 flex items-center justify-center text-sm font-black mr-3 pixel-border" style={{
                fontFamily: "'Orbitron', monospace"
              }}>5</span>
              📊 CAMPAIGN SUMMARY
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Campaign Overview */}
              <div className="space-y-4">
                <h4 className="text-lg font-black text-black flex items-center" style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}>
                  📋 OVERVIEW
                </h4>

                <div className="space-y-3">
                  <div className="bg-black text-white p-3 pixel-border">
                    <div className="text-xs font-black mb-1" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}>Title:</div>
                    <div className="font-bold" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>{formData.title || 'NOT SET'}</div>
                  </div>

                  <div className="bg-black text-white p-3 pixel-border">
                    <div className="text-xs font-black mb-1" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}>Total Reward:</div>
                    <div className="font-bold text-yellow-400" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>{formData.rewardAmount} STT</div>
                  </div>

                  <div className="bg-black text-white p-3 pixel-border">
                    <div className="text-xs font-black mb-1" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}>Registration Ends:</div>
                    <div className="font-bold text-green-400 text-sm" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>
                      {registrationEndDate.toLocaleDateString()} {registrationEndDate.toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="bg-black text-white p-3 pixel-border">
                    <div className="text-xs font-black mb-1" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}>Campaign Ends:</div>
                    <div className="font-bold text-red-400 text-sm" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>
                      {campaignEndDate.toLocaleDateString()} {campaignEndDate.toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="bg-black text-white p-3 pixel-border">
                    <div className="text-xs font-black mb-1" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}>AI Verification:</div>
                    <div className="font-bold text-cyan-400 text-sm" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>
                      {aiSettings.enabled ? '🤖 ENABLED' : '❌ DISABLED'}
                    </div>
                  </div>

                  {aiSettings.enabled && (
                    <>
                      <div className="bg-black text-white p-3 pixel-border">
                        <div className="text-xs font-black mb-1" style={{
                          fontFamily: "'Orbitron', monospace",
                          textTransform: 'uppercase'
                        }}>Min Word Count:</div>
                        <div className="font-bold text-purple-400 text-sm" style={{
                          fontFamily: "'Orbitron', monospace"
                        }}>
                          {aiSettings.minimumWordCount} WORDS
                        </div>
                      </div>

                      {aiSettings.requiredKeywords.length > 0 && (
                        <div className="bg-black text-white p-3 pixel-border">
                          <div className="text-xs font-black mb-1" style={{
                            fontFamily: "'Orbitron', monospace",
                            textTransform: 'uppercase'
                          }}>Required Keywords:</div>
                          <div className="font-bold text-blue-400 text-sm" style={{
                            fontFamily: "'Orbitron', monospace"
                          }}>
                            {aiSettings.requiredKeywords.slice(0, 3).join(', ')}
                            {aiSettings.requiredKeywords.length > 3 ? '...' : ''}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Quick Actions & Info */}
              <div className="space-y-4">
                <h4 className="text-lg font-black text-black flex items-center" style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}>
                  ⚡ QUICK ACTIONS
                </h4>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        title: '',
                        description: '',
                        requirements: '',
                        rewardAmount: '0.1'
                      });
                      setRegistrationEndDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
                      setCampaignEndDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));
                      setAiSettings({
                        enabled: true,
                        minimumWordCount: 50,
                        requiredKeywords: [],
                        strictMode: false
                      });
                      toast.success('Form cleared! Start fresh.');
                    }}
                    className="w-full pixel-button py-3 px-4 text-sm font-black pixel-shadow transition-all duration-100 bg-gray-600 hover:bg-gray-700" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}
                  >
                    🔄 CLEAR FORM
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const campaignData = {
                        title: formData.title,
                        description: formData.description,
                        requirements: formData.requirements,
                        rewardAmount: formData.rewardAmount,
                        registrationEnd: registrationEndDate.toISOString(),
                        campaignEnd: campaignEndDate.toISOString(),
                        aiVerification: aiSettings
                      };

                      navigator.clipboard.writeText(JSON.stringify(campaignData, null, 2));
                      toast.success('Campaign data copied to clipboard!');
                    }}
                    className="w-full pixel-button py-3 px-4 text-sm font-black pixel-shadow transition-all duration-100 bg-blue-600 hover:bg-blue-700" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}
                  >
                    📋 COPY DATA
                  </button>

                  <div className="bg-black text-white p-3 pixel-border">
                    <div className="text-xs font-black mb-2" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}>💡 PRO TIPS:</div>
                    <div className="space-y-1 text-sm font-bold" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>
                      <div>• Higher rewards attract more influencers. Consider 1+ STT for viral campaigns!</div>
                      <div>• AI verification ensures genuine promotional content and prevents fraud.</div>
                      {aiSettings.enabled && (
                        <div>• Set {aiSettings.minimumWordCount} word minimum to ensure substantial brand mentions.</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-black text-white p-3 pixel-border">
                    <div className="text-xs font-black mb-2" style={{
                      fontFamily: "'Orbitron', monospace",
                      textTransform: 'uppercase'
                    }}>⏱️ TIMING:</div>
                    <div className="text-sm font-bold" style={{
                      fontFamily: "'Orbitron', monospace"
                    }}>
                      Duration: {Math.ceil((campaignEndDate - registrationEndDate) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pre-launch Checklist */}
            <div className="mt-6 bg-black text-white p-4 pixel-border">
              <h4 className="text-sm font-black mb-3" style={{
                fontFamily: "'Orbitron', monospace",
                textTransform: 'uppercase'
              }}>✅ PRE-LAUNCH CHECKLIST:</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className={formData.title ? 'text-green-400' : 'text-red-400'}>
                    {formData.title ? '✓' : '✗'}
                  </span>
                  <span style={{ fontFamily: "'Orbitron', monospace" }}>
                    Campaign title set
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={formData.description ? 'text-green-400' : 'text-red-400'}>
                    {formData.description ? '✓' : '✗'}
                  </span>
                  <span style={{ fontFamily: "'Orbitron', monospace" }}>
                    Description added
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={formData.requirements ? 'text-green-400' : 'text-red-400'}>
                    {formData.requirements ? '✓' : '✗'}
                  </span>
                  <span style={{ fontFamily: "'Orbitron', monospace" }}>
                    Requirements specified
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={parseFloat(formData.rewardAmount) >= 0.1 ? 'text-green-400' : 'text-red-400'}>
                    {parseFloat(formData.rewardAmount) >= 0.1 ? '✓' : '✗'}
                  </span>
                  <span style={{ fontFamily: "'Orbitron', monospace" }}>
                    Reward amount valid
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={registrationEndDate > new Date() ? 'text-green-400' : 'text-red-400'}>
                    {registrationEndDate > new Date() ? '✓' : '✗'}
                  </span>
                  <span style={{ fontFamily: "'Orbitron', monospace" }}>
                    Registration future date
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={campaignEndDate > registrationEndDate ? 'text-green-400' : 'text-red-400'}>
                    {campaignEndDate > registrationEndDate ? '✓' : '✗'}
                  </span>
                  <span style={{ fontFamily: "'Orbitron', monospace" }}>
                    Campaign end valid
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={aiSettings.enabled ? 'text-green-400' : 'text-yellow-400'}>
                    {aiSettings.enabled ? '✓' : '⚠'}
                  </span>
                  <span style={{ fontFamily: "'Orbitron', monospace" }}>
                    AI verification configured
                  </span>
                </div>

                {aiSettings.enabled && (
                  <div className="flex items-center gap-2">
                    <span className={aiSettings.minimumWordCount >= 10 && aiSettings.minimumWordCount <= 1000 ? 'text-green-400' : 'text-red-400'}>
                      {aiSettings.minimumWordCount >= 10 && aiSettings.minimumWordCount <= 1000 ? '✓' : '✗'}
                    </span>
                    <span style={{ fontFamily: "'Orbitron', monospace" }}>
                      Word count valid (10-1000)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Launch Campaign Button */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full pixel-button py-6 px-8 text-xl font-black pixel-shadow transition-all duration-100 disabled:opacity-60 disabled:cursor-not-allowed" style={{
                fontFamily: "'Orbitron', monospace",
                textTransform: 'uppercase',
                fontSize: '1.25rem'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="w-6 h-6 border-3 border-current border-t-transparent animate-spin mr-3" style={{
                    borderRadius: 0
                  }}></div>
                  CREATING CAMPAIGN...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  🚀 LAUNCH CAMPAIGN ({formData.rewardAmount} STT)
                </span>
              )}
            </button>
          </div>
          </form>
      </div>

      <div className="bg-white p-8 pixel-border pixel-shadow mt-8" style={{
        clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))'
      }}>
        <h3 className="text-black text-xl font-black mt-0 mb-4" style={{
          fontFamily: "'Orbitron', monospace",
          textTransform: 'uppercase'
        }}>◆ HOW IT WORKS:</h3>
        <ol className="text-black leading-relaxed list-none space-y-3 font-bold" style={{
          fontFamily: "'Orbitron', monospace"
        }}>
          <li className="flex items-start">
            <span className="text-black font-black mr-3 text-lg">►</span>
            YOU CREATE A CAMPAIGN AND DEPOSIT STT FOR REWARDS
          </li>
          <li className="flex items-start">
            <span className="text-black font-black mr-3 text-lg">►</span>
            INFLUENCERS REGISTER DURING THE REGISTRATION PERIOD
          </li>
          <li className="flex items-start">
            <span className="text-black font-black mr-3 text-lg">►</span>
            THEY CREATE YOUTUBE VIDEOS FOLLOWING YOUR REQUIREMENTS
          </li>
          <li className="flex items-start">
            <span className="text-black font-black mr-3 text-lg">►</span>
            AFTER THE CAMPAIGN ENDS, TOP 3 PERFORMERS AUTOMATICALLY RECEIVE REWARDS
          </li>
          <li className="flex items-start">
            <span className="text-black font-black mr-3 text-lg">►</span>
            PERFORMANCE IS CALCULATED BASED ON VIEWS (60%), LIKES (30%), AND COMMENTS (10%)
          </li>
        </ol>
      </div>
    </div>
  );
};

export default CreateCampaign;