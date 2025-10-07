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
const CAMPAIGN_MANAGER_ADDRESS = '0xbE92c4DfE7af220f4e8Cb74F2F8E75e83FC2AEB1';
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

const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
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

    const response = await axios.get(apiUrl, { params });

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

function calculatePerformanceScore(viewCount, likeCount, commentCount) {
  return (viewCount * 0.6) + (likeCount * 0.3) + (commentCount * 0.1);
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

// Submit Video
app.post('/api/submissions', async (req, res) => {
  try {
    const { campaignId, walletAddress, youtubeUrl } = req.body;

    const videoId = extractVideoIdFromUrl(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log(`📹 Extracting video ID from ${youtubeUrl}: ${videoId}`);

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

    const performanceScore = calculatePerformanceScore(
      videoStats.viewCount,
      videoStats.likeCount,
      videoStats.commentCount
    );

    const influencer = await Influencer.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!influencer) {
      return res.status(404).json({ error: 'Influencer not found. Please register first.' });
    }

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
        const performanceScore = calculatePerformanceScore(
          videoStats.viewCount,
          videoStats.likeCount,
          videoStats.commentCount
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

            try {
              const tx = await contract.completeCampaign(campaignId, winners, [0, 0, 0]);
              await tx.wait();
              console.log(`Campaign ${campaignId} completed with winners:`, winners);
            } catch (error) {
              console.error(`Error completing campaign ${campaignId}:`, error);
            }
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
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Database:', mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...');
});

export default app;