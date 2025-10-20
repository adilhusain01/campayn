import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import mongoose from 'mongoose';
import axios from 'axios';
import { ethers } from 'ethers';

// Import MongoDB models
import Campaign from './models/Campaign.js';
import Influencer from './models/Influencer.js';
import Submission from './models/Submission.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campayn');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
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
const CAMPAIGN_MANAGER_ADDRESS = '0x69579be58808F847a103479Bb023E9c457127369';
const CAMPAIGN_MANAGER_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "campaignId", "type": "uint256"}, {"internalType": "address[3]", "name": "winners", "type": "address[3]"}, {"internalType": "uint256[3]", "name": "", "type": "uint256[3]"}],
    "name": "completeCampaign",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "campaignId", "type": "uint256"}],
    "name": "getCampaignInfo",
    "outputs": [{"internalType": "address", "name": "company", "type": "address"}, {"internalType": "uint256", "name": "totalReward", "type": "uint256"}, {"internalType": "uint256", "name": "registrationEnd", "type": "uint256"}, {"internalType": "uint256", "name": "campaignEnd", "type": "uint256"}, {"internalType": "bool", "name": "isActive", "type": "bool"}, {"internalType": "bool", "name": "isCompleted", "type": "bool"}, {"internalType": "uint256", "name": "influencerCount", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "campaignId", "type": "uint256"}],
    "name": "getCampaignInfluencers",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveCampaigns",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const provider = new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(CAMPAIGN_MANAGER_ADDRESS, CAMPAIGN_MANAGER_ABI, wallet);

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

// API Routes

// Create Campaign
app.post('/api/campaigns', async (req, res) => {
  try {
    const { blockchainId, title, description, requirements } = req.body;

    const campaign = new Campaign({
      blockchainId,
      title,
      description,
      requirements
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
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
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

    const influencer = await Influencer.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      {
        walletAddress: walletAddress.toLowerCase(),
        youtubeChannelId,
        youtubeChannelName,
        email
      },
      { upsert: true, new: true }
    );

    res.json({ id: influencer._id });
  } catch (error) {
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
      performanceScore
    });

    const savedSubmission = await submission.save();
    res.json({
      id: savedSubmission._id,
      videoStats,
      performanceScore
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
      wallet_address: submission.influencerId.walletAddress,
      youtube_channel_name: submission.influencerId.youtubeChannelName
    }));

    res.json(formattedSubmissions);
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
cron.schedule('0 */6 * * *', async () => {
  console.log('Checking for campaigns to complete...');

  try {
    const activeCampaigns = await contract.getActiveCampaigns();

    for (const campaignId of activeCampaigns) {
      try {
        const campaignInfo = await contract.getCampaignInfo(campaignId);
        const campaignEnd = Number(campaignInfo[3]) * 1000;
        const isCompleted = campaignInfo[5];

        if (Date.now() >= campaignEnd && !isCompleted) {
          const topPerformers = await Submission.find({ campaignId })
            .populate('influencerId', 'walletAddress')
            .sort({ performanceScore: -1 })
            .limit(3)
            .lean();

          if (topPerformers.length >= 3) {
            const winners = [
              topPerformers[0].influencerId.walletAddress,
              topPerformers[1].influencerId.walletAddress,
              topPerformers[2].influencerId.walletAddress
            ];

            // Calculate proper reward distribution (50%, 30%, 20%)
            const totalReward = campaignInfo[1]; // Total reward in wei
            const rewards = [
              (totalReward * BigInt(50)) / BigInt(100), // 50% for 1st place
              (totalReward * BigInt(30)) / BigInt(100), // 30% for 2nd place
              (totalReward * BigInt(20)) / BigInt(100)  // 20% for 3rd place
            ];

            try {
              const tx = await contract.completeCampaign(campaignId, winners, rewards);
              await tx.wait();
              console.log(`Campaign ${campaignId} completed with winners:`, winners);
              console.log(`Rewards distributed: 1st: ${ethers.formatEther(rewards[0])} FLOW, 2nd: ${ethers.formatEther(rewards[1])} FLOW, 3rd: ${ethers.formatEther(rewards[2])} FLOW`);
            } catch (error) {
              console.error(`Error completing campaign ${campaignId}:`, error);
            }
          } else {
            console.log(`Campaign ${campaignId} has insufficient participants (${topPerformers.length}/3 required)`);
          }
        }
      } catch (error) {
        console.error(`Error processing campaign ${campaignId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
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
  console.log(`Server running on port ${PORT}`);
  console.log('Database:', mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...');
});

export default app;