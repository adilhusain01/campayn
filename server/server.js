import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import mongoose from 'mongoose';
import axios from 'axios';
import { ethers } from 'ethers';

// Load environment variables first
dotenv.config();

// Import MongoDB models
import Campaign from './models/Campaign.js';
import Influencer from './models/Influencer.js';
import Submission from './models/Submission.js';

// Import AI services (after env vars are loaded)
import aiVerificationService from './services/aiVerificationService.js';

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Campayn Server...');
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Port: ${PORT}`);

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📥 [${timestamp}] ${req.method} ${req.path}`);
  if (Object.keys(req.body).length > 0) {
    console.log(`📋 Request body: ${JSON.stringify(req.body, null, 2)}`);
  }
  next();
});

// MongoDB Connection
const connectDB = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campayn');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Initialize database connection
connectDB();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// YouTube API Rate Limiting Manager
class YouTubeAPIManager {
  constructor() {
    this.quotaUsed = 0;
    this.dailyLimit = 10000; // YouTube API daily quota
    this.requestsToday = 0;
    this.lastResetDate = new Date().toDateString();
    this.requestQueue = [];
    this.isProcessing = false;
  }

  resetDailyQuota() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.quotaUsed = 0;
      this.requestsToday = 0;
      this.lastResetDate = today;
      console.log('🔄 YouTube API quota reset for new day');
    }
  }

  async makeRequest(url, params, quotaCost = 1) {
    this.resetDailyQuota();

    if (this.quotaUsed + quotaCost > this.dailyLimit) {
      throw new Error(`YouTube API daily quota would be exceeded. Used: ${this.quotaUsed}/${this.dailyLimit}`);
    }

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        console.log(`🌐 YouTube API Request (Attempt ${attempt + 1}/${maxAttempts}): ${url}`);
        console.log(`📊 Quota: ${this.quotaUsed}/${this.dailyLimit} (Cost: ${quotaCost})`);

        const response = await axios.get(url, { params });

        this.quotaUsed += quotaCost;
        this.requestsToday++;

        console.log(`✅ YouTube API Success. New quota usage: ${this.quotaUsed}/${this.dailyLimit}`);
        return response;

      } catch (error) {
        attempt++;

        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || Math.pow(2, attempt);
          console.log(`⏳ Rate limited. Waiting ${retryAfter} seconds before retry...`);
          await this.sleep(retryAfter * 1000);
        } else if (error.response?.status === 403) {
          console.error('🚫 YouTube API quota exceeded or access forbidden');
          throw new Error('YouTube API quota exceeded or access forbidden');
        } else if (attempt >= maxAttempts) {
          console.error(`💥 YouTube API failed after ${maxAttempts} attempts:`, error.message);
          throw error;
        } else {
          console.log(`⚠️ YouTube API error, retrying in ${Math.pow(2, attempt)} seconds...`);
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw new Error(`YouTube API failed after ${maxAttempts} attempts`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQuotaStatus() {
    this.resetDailyQuota();
    return {
      used: this.quotaUsed,
      limit: this.dailyLimit,
      remaining: this.dailyLimit - this.quotaUsed,
      percentage: Math.round((this.quotaUsed / this.dailyLimit) * 100),
      requestsToday: this.requestsToday
    };
  }
}

const youtubeAPI = new YouTubeAPIManager();

import { CAMPAIGN_MANAGER_ADDRESS, CAMPAIGN_MANAGER_ABI } from './utils/contract.js';

console.log('⛓️ Initializing blockchain connection...');
const provider = new ethers.JsonRpcProvider('https://dream-rpc.somnia.network');
console.log('🔐 Creating wallet instance...');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
console.log(`💼 Wallet address: ${wallet.address}`);
console.log('📄 Connecting to smart contract...');
const contract = new ethers.Contract(CAMPAIGN_MANAGER_ADDRESS, CAMPAIGN_MANAGER_ABI, wallet);
console.log(`✅ Contract connected at: ${CAMPAIGN_MANAGER_ADDRESS}`);

async function getYouTubeVideoStats(videoId) {
  console.log(`🎥 Attempting to fetch YouTube stats for video ID: ${videoId}`);
  console.log(`🔑 YouTube API Key configured: ${!!YOUTUBE_API_KEY}`);
  console.log(`🔑 API Key length: ${YOUTUBE_API_KEY ? YOUTUBE_API_KEY.length : 0} characters`);

  try {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos`;
    const params = {
      id: videoId,
      key: YOUTUBE_API_KEY,
      part: 'snippet,statistics,contentDetails'
    };

    console.log(`🌐 Making request to: ${apiUrl}`);
    console.log(`📊 Request params:`, { ...params, key: '[HIDDEN]' });

    const response = await youtubeAPI.makeRequest(apiUrl, params, 1);

    console.log(`✅ YouTube API Response Status: ${response.status}`);
    console.log(`📈 Response data items count: ${response.data.items?.length || 0}`);

    if (response.data.items.length === 0) {
      console.log(`❌ No video found for ID: ${videoId}`);
      throw new Error('Video not found');
    }

    const video = response.data.items[0];
    const stats = {
      videoId: video.id,
      title: video.snippet.title,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      viewCount: parseInt(video.statistics.viewCount || 0),
      likeCount: parseInt(video.statistics.likeCount || 0),
      commentCount: parseInt(video.statistics.commentCount || 0),
      duration: video.contentDetails.duration
    };

    console.log(`🎉 Successfully fetched stats:`, {
      title: stats.title,
      views: stats.viewCount,
      likes: stats.likeCount,
      comments: stats.commentCount,
      channel: stats.channelTitle
    });

    return stats;
  } catch (error) {
    console.error(`💥 Error fetching YouTube stats for video ${videoId}:`);
    console.error(`Error type: ${error.name}`);
    console.error(`Error message: ${error.message}`);

    if (error.response) {
      console.error(`HTTP Status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }

    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }

    throw error;
  }
}

function calculatePerformanceScore(viewCount, likeCount, commentCount, videoDuration = 60) {
  // Prevent gaming with logarithmic scaling and engagement ratios

  // 1. View score with diminishing returns (40% weight)
  const viewScore = Math.log10(Math.max(1, viewCount)) * 40;

  // 2. Engagement ratio to prevent fake views (30% weight)
  const totalEngagement = likeCount + commentCount;
  const engagementRatio = Math.min(totalEngagement / Math.max(1, viewCount), 0.1); // Cap at 10%
  const engagementScore = engagementRatio * 3000; // Scale to meaningful range

  // 3. Quality metrics (30% weight)
  const likeRatio = likeCount / Math.max(1, viewCount);
  const commentRatio = commentCount / Math.max(1, viewCount);

  // Prefer content with balanced engagement
  const qualityScore = (
    Math.min(likeRatio * 1000, 20) + // Cap like influence
    Math.min(commentRatio * 5000, 10) + // Comments worth more but capped
    Math.min(videoDuration / 10, 20) // Prefer longer content up to 200 seconds
  );

  const totalScore = viewScore + engagementScore + qualityScore;

  // Add randomness to prevent exact ties and gaming
  const randomFactor = Math.random() * 0.1;

  return Math.max(0, totalScore + randomFactor);
}

function parseISODuration(duration) {
  // Convert ISO 8601 duration (PT1M30S) to seconds
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 60; // Default 1 minute

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  return hours * 3600 + minutes * 60 + seconds;
}

function extractVideoIdFromUrl(url) {
  // More comprehensive regex to handle various YouTube URL formats
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);

  // Additional fallback for standard watch URLs
  if (!match) {
    const watchRegex = /[?&]v=([a-zA-Z0-9_-]{11})/;
    const watchMatch = url.match(watchRegex);
    return watchMatch ? watchMatch[1] : null;
  }

  return match[1];
}

// AI Verification Helper Function
async function performAIVerification(submissionId, videoId, campaign) {
  try {
    console.log(`🤖 Starting AI verification for submission ${submissionId}, video ${videoId}`);

    // Check if AI verification is enabled for this campaign
    if (!campaign.aiVerification || !campaign.aiVerification.enabled) {
      console.log(`⚠️ AI verification disabled for campaign ${campaign.blockchainId}`);
      await Submission.findByIdAndUpdate(submissionId, {
        'aiVerification.status': 'approved',
        'aiVerification.approved': true,
        'aiVerification.reason': 'AI verification disabled for this campaign',
        'aiVerification.verifiedAt': new Date()
      });
      return;
    }

    // Perform AI verification
    const verificationResult = await aiVerificationService.verifyVideoContent(videoId, {
      title: campaign.title,
      description: campaign.description,
      requirements: campaign.requirements,
      aiVerification: campaign.aiVerification
    });

    // Update submission with verification results
    const updateData = {
      'aiVerification.status': verificationResult.approved ? 'approved' : 'rejected',
      'aiVerification.approved': verificationResult.approved,
      'aiVerification.confidence': verificationResult.confidence,
      'aiVerification.reason': verificationResult.reason,
      'aiVerification.brandMentions': verificationResult.brandMentions || [],
      'aiVerification.promotionalSegmentWordCount': verificationResult.promotionalSegmentWordCount || 0,
      'aiVerification.meetsRequirements': verificationResult.meetsRequirements || {},
      'aiVerification.transcriptLanguage': verificationResult.transcriptLanguage,
      'aiVerification.transcriptLength': verificationResult.transcriptLength,
      'aiVerification.processingTime': verificationResult.processingTime,
      'aiVerification.verifiedAt': new Date()
    };

    if (verificationResult.error) {
      updateData['aiVerification.status'] = 'error';
      updateData['aiVerification.error'] = verificationResult.error;
    }

    await Submission.findByIdAndUpdate(submissionId, updateData);

    console.log(`✅ AI verification completed for submission ${submissionId}. Result: ${verificationResult.approved ? 'APPROVED' : 'REJECTED'}`);

  } catch (error) {
    console.error(`❌ AI verification failed for submission ${submissionId}:`, error.message);

    // Update submission with error status
    await Submission.findByIdAndUpdate(submissionId, {
      'aiVerification.status': 'error',
      'aiVerification.approved': false,
      'aiVerification.reason': `AI verification failed: ${error.message}`,
      'aiVerification.error': 'PROCESSING_ERROR',
      'aiVerification.verifiedAt': new Date()
    });
  }
}

// API Routes

// Create Campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    const {
      blockchainId,
      title,
      description,
      requirements,
      aiVerification
    } = req.body;

    const campaign = new Campaign({
      blockchainId,
      title,
      description,
      requirements,
      aiVerification: aiVerification || {
        enabled: true,
        minimumWordCount: 50,
        requiredKeywords: [],
        strictMode: false
      }
    });

    const savedCampaign = await campaign.save();
    res.json({ id: savedCampaign._id, blockchainId });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Campaign with this blockchain ID already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get All Campaigns
app.get('/api/campaigns', async (req, res) => {
  try {
    console.log('📋 Fetching all campaigns from database...');
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    console.log(`✅ Found ${campaigns.length} campaigns`);
    res.json(campaigns);
  } catch (error) {
    console.error('❌ Error fetching campaigns:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Campaign by ID
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findOne({ blockchainId: id });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Influencer by Wallet Address
app.get('/api/influencers/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const influencer = await Influencer.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (!influencer) {
      return res.status(404).json({ error: 'Influencer not found' });
    }

    res.json(influencer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Update Influencer
app.post('/api/influencers', async (req, res) => {
  try {
    const { walletAddress, youtubeChannelId, youtubeChannelName, email } = req.body;

    const lowerWalletAddress = walletAddress.toLowerCase();


    // Check for duplicate YouTube Channel ID (only if it's different from current user's)
    if (youtubeChannelId) {
      const channelExists = await Influencer.findOne({
        youtubeChannelId,
        walletAddress: { $ne: lowerWalletAddress }
      });

      if (channelExists) {
        return res.status(400).json({
          error: 'This YouTube Channel ID is already registered by another influencer',
          field: 'youtubeChannelId',
          existingUser: {
            channelName: channelExists.youtubeChannelName,
            walletAddress: channelExists.walletAddress.slice(0, 6) + '...' + channelExists.walletAddress.slice(-4)
          }
        });
      }
    }

    // Check for duplicate email (only if it's different from current user's)
    if (email) {
      const emailExists = await Influencer.findOne({
        email: email.toLowerCase(),
        walletAddress: { $ne: lowerWalletAddress }
      });

      if (emailExists) {
        return res.status(400).json({
          error: 'This email is already registered by another influencer',
          field: 'email',
          existingUser: {
            channelName: emailExists.youtubeChannelName,
            walletAddress: emailExists.walletAddress.slice(0, 6) + '...' + emailExists.walletAddress.slice(-4)
          }
        });
      }
    }

    // Create or update influencer
    const influencer = await Influencer.findOneAndUpdate(
      { walletAddress: lowerWalletAddress },
      {
        walletAddress: lowerWalletAddress,
        youtubeChannelId,
        youtubeChannelName,
        email: email ? email.toLowerCase() : email
      },
      { upsert: true, new: true }
    );

    res.json({ id: influencer._id });
  } catch (error) {
    console.error('Error saving influencer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify YouTube Channel
app.post('/api/influencers/verify-channel', async (req, res) => {
  try {
    const { walletAddress, youtubeChannelId, verificationCode } = req.body;

    if (!walletAddress || !youtubeChannelId || !verificationCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if channel exists and get channel info
    console.log(`🔍 Verifying channel ${youtubeChannelId} for wallet ${walletAddress}`);

    try {
      const channelResponse = await youtubeAPI.makeRequest('https://www.googleapis.com/youtube/v3/channels', {
        id: youtubeChannelId,
        key: YOUTUBE_API_KEY,
        part: 'snippet,brandingSettings'
      }, 1);

      if (channelResponse.data.items.length === 0) {
        return res.status(404).json({ error: 'YouTube channel not found' });
      }

      const channel = channelResponse.data.items[0];

      // Check channel banner description for verification code
      const bannerDescription = channel.brandingSettings?.channel?.description || '';
      const channelDescription = channel.snippet?.description || '';

      let verificationFound = false;
      let verificationMethod = '';

      // Check channel description
      if (channelDescription.includes(verificationCode)) {
        verificationFound = true;
        verificationMethod = 'channel_description';
        console.log(`✅ Verification code found in channel description`);
      }

      // If not found in description, check recent videos
      if (!verificationFound) {
        try {
          const videosResponse = await youtubeAPI.makeRequest('https://www.googleapis.com/youtube/v3/search', {
            channelId: youtubeChannelId,
            key: YOUTUBE_API_KEY,
            part: 'snippet',
            order: 'date',
            maxResults: 5,
            type: 'video'
          }, 100); // Search costs 100 quota units

          for (const video of videosResponse.data.items) {
            const videoId = video.id.videoId;

            // Get video details
            const videoDetailsResponse = await youtubeAPI.makeRequest('https://www.googleapis.com/youtube/v3/videos', {
              id: videoId,
              key: YOUTUBE_API_KEY,
              part: 'snippet'
            }, 1);

            if (videoDetailsResponse.data.items.length > 0) {
              const videoDetails = videoDetailsResponse.data.items[0];
              const videoDescription = videoDetails.snippet.description || '';
              const videoTitle = videoDetails.snippet.title || '';

              if (videoDescription.includes(verificationCode)) {
                verificationFound = true;
                verificationMethod = 'video_description';
                console.log(`✅ Verification code found in video description: ${videoTitle}`);
                break;
              }

              if (videoTitle.includes(verificationCode)) {
                verificationFound = true;
                verificationMethod = 'video_title';
                console.log(`✅ Verification code found in video title: ${videoTitle}`);
                break;
              }
            }
          }
        } catch (videoError) {
          console.log('Could not check videos for verification code:', videoError.message);
        }
      }

      if (!verificationFound) {
        return res.status(400).json({
          error: 'Verification code not found in channel description or recent videos. Please add the code and try again.'
        });
      }

      // Update influencer with verification
      const influencer = await Influencer.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        {
          isChannelVerified: true,
          verificationMethod,
          verificationCode,
          verificationDate: new Date()
        },
        { new: true }
      );

      if (!influencer) {
        return res.status(404).json({ error: 'Influencer profile not found' });
      }

      console.log(`✅ Channel verification completed for ${walletAddress} using ${verificationMethod}`);
      res.json({
        success: true,
        verificationMethod,
        message: 'Channel verified successfully!'
      });

    } catch (youtubeError) {
      console.error('YouTube API error during verification:', youtubeError.message);
      return res.status(400).json({ error: 'Failed to verify channel with YouTube API' });
    }

  } catch (error) {
    console.error('Channel verification error:', error);
    res.status(500).json({ error: 'Internal server error during verification' });
  }
});

// Check if influencer is verified (required for campaign registration)
app.get('/api/influencers/:walletAddress/verification-status', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const influencer = await Influencer.findOne({
      walletAddress: walletAddress.toLowerCase()
    });

    if (!influencer) {
      return res.status(404).json({
        error: 'Influencer profile not found',
        isVerified: false,
        hasProfile: false
      });
    }

    const isVerified = influencer.isChannelVerified === true;
    const hasRequiredFields = !!(influencer.youtubeChannelId && influencer.youtubeChannelName);

    res.json({
      isVerified,
      hasProfile: true,
      hasRequiredFields,
      canRegisterForCampaigns: isVerified && hasRequiredFields,
      profile: {
        youtubeChannelName: influencer.youtubeChannelName,
        youtubeChannelId: influencer.youtubeChannelId,
        email: influencer.email,
        verificationDate: influencer.verificationDate
      }
    });

  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Video Ownership
app.post('/api/influencers/verify-video-ownership', async (req, res) => {
  try {
    const { videoId, expectedChannelId, walletAddress } = req.body;

    if (!videoId || !expectedChannelId || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`🔍 Verifying video ${videoId} belongs to channel ${expectedChannelId}`);

    try {
      // Get video details from YouTube API
      const videoResponse = await youtubeAPI.makeRequest('https://www.googleapis.com/youtube/v3/videos', {
        id: videoId,
        key: YOUTUBE_API_KEY,
        part: 'snippet'
      }, 1);

      if (videoResponse.data.items.length === 0) {
        return res.status(404).json({
          error: 'Video not found',
          isOwner: false
        });
      }

      const video = videoResponse.data.items[0];
      const actualChannelId = video.snippet.channelId;
      const actualChannelTitle = video.snippet.channelTitle;

      console.log(`📹 Video channel: ${actualChannelId} (${actualChannelTitle})`);
      console.log(`👤 Expected channel: ${expectedChannelId}`);

      const isOwner = actualChannelId === expectedChannelId;

      if (isOwner) {
        console.log(`✅ Video ownership verified!`);
      } else {
        console.log(`❌ Video ownership mismatch!`);
      }

      res.json({
        isOwner,
        actualChannelId,
        actualChannelTitle,
        videoTitle: video.snippet.title,
        videoId
      });

    } catch (youtubeError) {
      console.error('YouTube API error during video verification:', youtubeError.message);

      if (youtubeError.response?.status === 403) {
        return res.status(403).json({
          error: 'Video access restricted or private',
          isOwner: false
        });
      }

      return res.status(400).json({
        error: 'Failed to verify video with YouTube API',
        isOwner: false
      });
    }

  } catch (error) {
    console.error('Video verification error:', error);
    res.status(500).json({
      error: 'Internal server error during video verification',
      isOwner: false
    });
  }
});

// Submit Video
app.post('/api/submissions', async (req, res) => {
  try {
    const { campaignId, walletAddress, youtubeUrl } = req.body;

    // Check if influencer has verified channel
    const influencer = await Influencer.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!influencer) {
      return res.status(400).json({ error: 'Influencer profile not found. Please complete your profile first.' });
    }

    if (!influencer.isChannelVerified) {
      return res.status(400).json({ error: 'YouTube channel must be verified before submitting videos. Please verify your channel in your profile.' });
    }

    // Get campaign data early for use in AI verification
    const campaign = await Campaign.findOne({ blockchainId: campaignId });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const videoId = extractVideoIdFromUrl(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Verify that the video belongs to the influencer's verified channel
    try {
      const videoDetailsResponse = await youtubeAPI.makeRequest('https://www.googleapis.com/youtube/v3/videos', {
        id: videoId,
        key: YOUTUBE_API_KEY,
        part: 'snippet'
      }, 1);

      if (videoDetailsResponse.data.items.length === 0) {
        return res.status(404).json({ error: 'Video not found on YouTube' });
      }

      const video = videoDetailsResponse.data.items[0];
      const videoChannelId = video.snippet.channelId;

      if (videoChannelId !== influencer.youtubeChannelId) {
        return res.status(400).json({
          error: `Video must be uploaded to your verified channel. This video belongs to a different channel.`
        });
      }

      console.log(`✅ Video channel verification passed for ${videoId} - belongs to ${influencer.youtubeChannelName}`);

      // Check if video was published after campaign creation

      const videoPublishedAt = new Date(video.snippet.publishedAt);
      const campaignCreatedAt = new Date(campaign.createdAt);

      console.log(`📅 Video published: ${videoPublishedAt.toISOString()}`);
      console.log(`📅 Campaign created: ${campaignCreatedAt.toISOString()}`);

      if (videoPublishedAt < campaignCreatedAt) {
        return res.status(400).json({
          error: `Video must be published after the campaign was created. This video was published on ${videoPublishedAt.toLocaleDateString()} but the campaign was created on ${campaignCreatedAt.toLocaleDateString()}.`,
          videoPublished: videoPublishedAt.toISOString(),
          campaignCreated: campaignCreatedAt.toISOString()
        });
      }

      console.log(`✅ Video publish date validation passed - video is newer than campaign`);
    } catch (channelCheckError) {
      console.error('Error verifying video channel:', channelCheckError.message);
      return res.status(400).json({ error: 'Failed to verify video channel ownership' });
    }

    console.log(`📹 Extracting video ID from ${youtubeUrl}: ${videoId}`);

    // Check for duplicate submission (one submission per campaign per influencer)
    const existingSubmission = await Submission.findOne({
      campaignId: campaignId,
      influencerId: influencer._id
    });

    if (existingSubmission) {
      return res.status(400).json({
        error: 'You have already submitted a video for this campaign. Only one submission per campaign is allowed.',
        existingSubmission: {
          youtubeUrl: existingSubmission.youtubeUrl,
          submittedAt: existingSubmission.createdAt,
          performanceScore: existingSubmission.performanceScore
        }
      });
    }

    let videoStats = {
      viewCount: 0,
      likeCount: 0,
      commentCount: 0
    };

    // Try to fetch YouTube stats, but don't fail the submission if it fails
    try {
      console.log(`🚀 Starting YouTube API fetch for video: ${videoId}`);
      videoStats = await getYouTubeVideoStats(videoId);
      console.log(`✅ YouTube stats successfully fetched for ${videoId}:`, {
        views: videoStats.viewCount,
        likes: videoStats.likeCount,
        comments: videoStats.commentCount,
        title: videoStats.title
      });
    } catch (error) {
      console.error(`❌ Failed to fetch YouTube stats for video ${videoId}:`);
      console.error(`Error message: ${error.message}`);
      console.error(`API Key configured: ${!!YOUTUBE_API_KEY}`);
      console.error(`Full error:`, error);
      console.log(`⚠️  Continuing with default stats (all zeros)`);
      // Continue with default values
    }

    // Extract duration in seconds from ISO 8601 format (PT1M30S -> 90)
    const durationSeconds = videoStats.duration ?
      parseISODuration(videoStats.duration) : 60;

    const performanceScore = calculatePerformanceScore(
      videoStats.viewCount,
      videoStats.likeCount,
      videoStats.commentCount,
      durationSeconds
    );

    const submission = new Submission({
      campaignId,
      influencerId: influencer._id,
      youtubeVideoId: videoId,
      youtubeUrl,
      viewCount: videoStats.viewCount,
      likeCount: videoStats.likeCount,
      commentCount: videoStats.commentCount,
      performanceScore,
      aiVerification: {
        status: 'pending'
      }
    });

    const savedSubmission = await submission.save();

    // Perform AI content verification asynchronously
    performAIVerification(savedSubmission._id, videoId, campaign);

    // Return complete submission data with all required fields
    res.json({
      id: savedSubmission._id,
      campaignId: savedSubmission.campaignId,
      influencerId: savedSubmission.influencerId,
      youtubeVideoId: savedSubmission.youtubeVideoId,
      youtubeUrl: savedSubmission.youtubeUrl,
      viewCount: savedSubmission.viewCount,
      likeCount: savedSubmission.likeCount,
      commentCount: savedSubmission.commentCount,
      performanceScore: savedSubmission.performanceScore,
      createdAt: savedSubmission.createdAt,
      updatedAt: savedSubmission.updatedAt,
      // Add additional fields for client compatibility
      youtube_video_id: savedSubmission.youtubeVideoId,
      youtube_url: savedSubmission.youtubeUrl,
      view_count: savedSubmission.viewCount,
      like_count: savedSubmission.likeCount,
      comment_count: savedSubmission.commentCount,
      performance_score: savedSubmission.performanceScore,
      wallet_address: walletAddress.toLowerCase(),
      youtube_channel_name: influencer.youtubeChannelName,
      aiVerification: savedSubmission.aiVerification
    });
  } catch (error) {
    console.error('Error in video submission:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Campaign Leaderboard
app.get('/api/campaigns/:id/leaderboard', async (req, res) => {
  try {
    const { id } = req.params;

    const leaderboard = await Submission.find({ campaignId: id })
      .populate('influencerId', 'walletAddress youtubeChannelName')
      .sort({ performanceScore: -1 })
      .lean();

    const leaderboardWithRanks = leaderboard.map((submission, index) => ({
      ...submission,
      rank: index + 1,
      wallet_address: submission.influencerId.walletAddress,
      youtube_channel_name: submission.influencerId.youtubeChannelName
    }));

    res.json(leaderboardWithRanks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Campaign Submissions
app.get('/api/campaigns/:id/submissions', async (req, res) => {
  try {
    const { id } = req.params;

    const submissions = await Submission.find({ campaignId: id })
      .populate('influencerId', 'walletAddress youtubeChannelName')
      .sort({ createdAt: -1 })
      .lean();

    const formattedSubmissions = submissions.map(submission => ({
      ...submission,
      id: submission._id,
      wallet_address: submission.influencerId.walletAddress,
      youtube_channel_name: submission.influencerId.youtubeChannelName
    }));

    res.json(formattedSubmissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI Verification Status for Submission
app.get('/api/submissions/:id/ai-verification', async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findById(id)
      .select('aiVerification youtubeVideoId youtubeUrl')
      .lean();

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({
      submissionId: id,
      videoId: submission.youtubeVideoId,
      videoUrl: submission.youtubeUrl,
      aiVerification: submission.aiVerification
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually Trigger AI Verification (for testing/retry)
app.post('/api/submissions/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findById(id)
      .populate({
        path: 'campaignId',
        model: 'Campaign'
      });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const campaign = await Campaign.findOne({ blockchainId: submission.campaignId });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Reset verification status
    await Submission.findByIdAndUpdate(id, {
      'aiVerification.status': 'pending',
      'aiVerification.approved': false
    });

    // Trigger AI verification
    performAIVerification(id, submission.youtubeVideoId, campaign);

    res.json({
      message: 'AI verification triggered',
      submissionId: id,
      status: 'processing'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics Update Cron Job
cron.schedule('0 */2 * * *', async () => {
  console.log('🔄 Running scheduled analytics update...');

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const submissions = await Submission.find({
      lastAnalyticsUpdate: { $lt: oneHourAgo }
    }).distinct('youtubeVideoId');

    console.log(`📊 Found ${submissions.length} videos to update analytics for`);

    if (submissions.length === 0) {
      console.log('✅ No videos need analytics updates at this time');
      return;
    }

    for (const videoId of submissions) {
      try {
        console.log(`🔄 Updating analytics for video: ${videoId}`);
        const videoStats = await getYouTubeVideoStats(videoId);
        const durationSeconds = videoStats.duration ?
          parseISODuration(videoStats.duration) : 60;

        const performanceScore = calculatePerformanceScore(
          videoStats.viewCount,
          videoStats.likeCount,
          videoStats.commentCount,
          durationSeconds
        );

        const updateResult = await Submission.updateMany(
          { youtubeVideoId: videoId },
          {
            viewCount: videoStats.viewCount,
            likeCount: videoStats.likeCount,
            commentCount: videoStats.commentCount,
            performanceScore,
            lastAnalyticsUpdate: new Date()
          }
        );

        console.log(`✅ Updated analytics for video ${videoId} - ${updateResult.modifiedCount} submissions updated`);
        console.log(`📈 New stats: ${videoStats.viewCount} views, ${videoStats.likeCount} likes, ${videoStats.commentCount} comments`);
      } catch (error) {
        console.error(`❌ Error updating video ${videoId}:`, error.message);
      }
    }

    console.log('🏁 Analytics update cron job completed');
  } catch (error) {
    console.error('💥 Error in analytics update cron job:', error);
  }
});

// Campaign Completion Cron Job
cron.schedule('0 * * * *', async () => {
  const timestamp = new Date().toISOString();
  console.log(`⏰ [${timestamp}] Starting campaign completion cron job...`);

  try {
    console.log('🔍 Fetching active campaigns from blockchain...');
    const activeCampaigns = await contract.getActiveCampaigns();
    console.log(`📊 Found ${activeCampaigns.length} active campaigns to check`);

    for (const campaignId of activeCampaigns) {
      try {
        const campaignInfo = await contract.getCampaignInfo(campaignId);
        const campaignEnd = Number(campaignInfo[3]) * 1000;
        const isCompleted = campaignInfo[5];

        if (Date.now() >= campaignEnd && !isCompleted) {
          console.log(`🎯 Campaign ${campaignId} has ended and needs completion`);
          console.log(`📅 Campaign end time: ${new Date(campaignEnd).toISOString()}`);

          // Get submissions with FCFS logic for equal performance scores
          console.log(`🏆 Fetching top performers for campaign ${campaignId}...`);
          const campaignIdNumber = Number(campaignId); // Convert BigInt to Number for MongoDB
          const topPerformers = await Submission.find({ campaignId: campaignIdNumber })
            .populate('influencerId', 'walletAddress')
            .sort({
              performanceScore: -1, // Primary: highest performance score first
              createdAt: 1           // Secondary: earliest submission first (FCFS for ties)
            })
            .limit(3)
            .lean();

          console.log(`📈 Found ${topPerformers.length} submissions for campaign ${campaignId}`);

          if (topPerformers.length >= 1) { // Changed from 3 to 1 minimum
            const winners = topPerformers.map(performer => performer.influencerId.walletAddress);
            const submissionTimes = topPerformers.map(performer => Math.floor(new Date(performer.createdAt).getTime() / 1000)); // Convert to Unix timestamp

            console.log(`🏆 Winners for campaign ${campaignId}:`);
            winners.forEach((winner, index) => {
              console.log(`  ${index + 1}. ${winner} (submitted: ${new Date(submissionTimes[index] * 1000).toISOString()})`);
            });

            try {
              console.log(`⛓️ Submitting completion transaction for campaign ${campaignId}...`);
              const tx = await contract.completeCampaignFlexible(campaignId, winners, submissionTimes);
              console.log(`📝 Transaction hash: ${tx.hash}`);
              console.log(`⏳ Waiting for transaction confirmation...`);
              const receipt = await tx.wait();
              console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

              // Calculate what each winner gets for logging
              const totalReward = campaignInfo[1]; // Total reward in wei
              const rewardPercentages = [50, 30, 20]; // Fixed percentages
              const actualRewards = [];
              let totalDistributed = BigInt(0);

              for (let i = 0; i < winners.length; i++) {
                const reward = (totalReward * BigInt(rewardPercentages[i])) / BigInt(100);
                actualRewards.push(reward);
                totalDistributed += reward;
              }

              const refundAmount = totalReward - totalDistributed;

              console.log(`🎉 Campaign ${campaignId} completed with ${winners.length} winner(s):`);
              for (let i = 0; i < winners.length; i++) {
                console.log(`   ${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : 'rd'} place: ${winners[i]} - ${ethers.formatEther(actualRewards[i])} STT (${rewardPercentages[i]}%)`);
              }
              if (refundAmount > 0) {
                console.log(`💰 Refund to creator: ${ethers.formatEther(refundAmount)} STT`);
              }
            } catch (error) {
              console.error(`❌ Error completing campaign ${campaignId}:`, error);
            }
          } else {
            console.log(`⚠️  Campaign ${campaignId} has no participants - all funds will be returned to creator`);

            // For campaigns with 0 participants, we need to use emergencyWithdraw
            // But emergency withdraw has a 7-day grace period, so we'll check if enough time has passed
            const gracePeriodEnd = campaignEnd + (7 * 24 * 60 * 60 * 1000); // 7 days after campaign end

            if (Date.now() >= gracePeriodEnd) {
              try {
                const tx = await contract.emergencyWithdraw(campaignId);
                await tx.wait();

                const totalReward = campaignInfo[1]; // Total reward in wei
                console.log(`💰 Emergency withdraw completed for campaign ${campaignId} - full refund of ${ethers.formatEther(totalReward)} STT returned to creator`);
              } catch (error) {
                console.error(`❌ Error performing emergency withdraw for campaign ${campaignId}:`, error);
              }
            } else {
              const timeLeft = Math.ceil((gracePeriodEnd - Date.now()) / (24 * 60 * 60 * 1000));
              console.log(`⏳ Campaign ${campaignId} has no participants. Emergency withdraw available in ${timeLeft} day(s)`);
            }
          }
        } else {
          console.log(`⏭️ Campaign ${campaignId} not ready for completion yet`);
        }
      } catch (error) {
        console.error(`❌ Error processing campaign ${campaignId}:`, error.message);
        console.error(`📍 Stack trace:`, error.stack);
      }
    }

    console.log(`🏁 Campaign completion cron job finished. Processed ${activeCampaigns.length} campaigns.`);
  } catch (error) {
    console.error('💥 Critical error in campaign completion cron job:', error.message);
    console.error('📍 Stack trace:', error.stack);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`💥 [${timestamp}] Unhandled error on ${req.method} ${req.path}`);
  console.error(`❌ Error message: ${error.message}`);
  console.error(`📍 Stack trace:`, error.stack);

  res.status(500).json({
    error: 'Internal server error',
    timestamp: timestamp,
    path: req.path,
    method: req.method
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const quotaStatus = youtubeAPI.getQuotaStatus();
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    youtubeAPI: {
      quotaUsed: quotaStatus.used,
      quotaLimit: quotaStatus.limit,
      quotaRemaining: quotaStatus.remaining,
      quotaPercentage: quotaStatus.percentage,
      requestsToday: quotaStatus.requestsToday
    }
  });
});

// YouTube API quota status endpoint
app.get('/api/youtube-quota', (req, res) => {
  const quotaStatus = youtubeAPI.getQuotaStatus();
  res.json(quotaStatus);
});

app.listen(PORT, () => {
  console.log('🎉 Server successfully started!');
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log('💾 Database:', mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Connecting... ⏳');
  console.log('⛓️ Blockchain:', wallet.address ? 'Connected ✅' : 'Not Connected ❌');
  console.log('🤖 YouTube API:', YOUTUBE_API_KEY ? 'Configured ✅' : 'Not Configured ❌');
  console.log('⏰ Cron jobs: Active ✅');
  console.log('=====================================');
});

export default app;