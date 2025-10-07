# Campayn - Decentralized Social Media Ad Campaigns

A decentralized platform for companies to create ad campaigns and reward influencers based on YouTube video performance, built on Base Sepolia testnet.

## 🚀 Features

### For Companies
- Create campaigns with ETH deposits on Base Sepolia
- Set campaign requirements and deadlines
- Automatic winner selection based on performance metrics
- 50%/30%/20% reward distribution to top 3 performers

### For Influencers
- Register for campaigns with wallet connection
- Submit YouTube videos for campaigns
- Real-time performance tracking
- Automatic ETH payouts to winners

### Technical Features
- Smart contract on Base Sepolia for secure fund management
- YouTube Analytics API integration for performance tracking
- Automated campaign completion via cron jobs
- Real-time leaderboards and analytics
- MongoDB database for scalable off-chain data storage

## 🏗️ Architecture

```
Frontend (React + Web3)
├── Wallet connection (MetaMask)
├── Campaign browsing and creation
├── Video submission interface
└── Real-time leaderboards

Backend (Node.js + Express + MongoDB)
├── YouTube Analytics API integration
├── Campaign data management with MongoDB
├── Performance scoring algorithm
└── Automated campaign completion

Smart Contract (Solidity)
├── Campaign creation with ETH deposits
├── Influencer registration
├── Automated reward distribution
└── Emergency withdrawal functions
```

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- MetaMask wallet
- YouTube Data API key
- Base Sepolia testnet ETH

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd Campayn

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Database Setup

**Option A: Local MongoDB**
```bash
# Install and start MongoDB locally
brew install mongodb/brew/mongodb-community
brew services start mongodb/brew/mongodb-community
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string from "Connect" → "Connect your application"

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Get from Google Cloud Console - YouTube Data API v3
YOUTUBE_API_KEY=your_youtube_api_key_here

# Private key for automated campaign completion (dedicated wallet recommended)
PRIVATE_KEY=your_private_key_here

# MongoDB connection string
MONGO_URI=mongodb://localhost:27017/campayn
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/campayn

# Server port
PORT=3001
```

### 4. Smart Contract

The contract is already deployed at: `0xbE92c4DfE7af220f4e8Cb74F2F8E75e83FC2AEB1`

If you need to deploy your own:
1. Open Remix IDE
2. Upload `CampaignManager.sol`
3. Compile and deploy to Base Sepolia
4. Update the address in `client/src/utils/contract.js`

### 5. YouTube API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Add the API key to your `.env` file

### 6. Base Sepolia Setup

1. Add Base Sepolia to MetaMask:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.basescan.org

2. Get testnet ETH from [Base Sepolia Faucet](https://faucet.quicknode.com/base/sepolia)

## 🚀 Running the Application

### Development Mode

```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

### Production Mode

```bash
# Build frontend
cd client
npm run build
cd ..

# Start backend
npm start
```

## 📱 Usage Guide

### For Companies (Creating Campaigns)

1. **Connect Wallet**: Connect MetaMask with Base Sepolia
2. **Create Campaign**:
   - Fill campaign details (title, description, requirements)
   - Set registration and campaign duration
   - Deposit ETH for rewards
3. **Monitor Progress**: View real-time submissions and leaderboard
4. **Automatic Completion**: System automatically distributes rewards after deadline

### For Influencers (Participating)

1. **Connect Wallet**: Connect MetaMask with Base Sepolia
2. **Set Up Profile**: Add YouTube channel information
3. **Browse Campaigns**: View active campaigns and requirements
4. **Register**: Register for campaigns during registration period
5. **Create Content**: Make YouTube videos following campaign requirements
6. **Submit Videos**: Submit video URLs through the platform
7. **Track Performance**: Monitor your position on leaderboards
8. **Receive Rewards**: Top 3 performers receive automatic ETH payouts

## 🧮 Performance Scoring

Videos are scored using the following algorithm:

```
Score = (views × 0.6) + (likes × 0.3) + (comments × 0.1)
```

- **60%** - View count (primary engagement metric)
- **30%** - Like count (appreciation metric)
- **10%** - Comment count (engagement depth)

## 🔄 Automated Systems

### Analytics Updates
- Runs every 2 hours
- Updates video statistics from YouTube API
- Recalculates performance scores

### Campaign Completion
- Runs every 6 hours
- Checks for expired campaigns
- Automatically triggers smart contract completion
- Distributes rewards to top 3 performers

## 🛡️ Security Features

- **Smart Contract Security**: Audited contract with emergency withdrawal
- **Wallet-based Authentication**: No passwords, wallet signatures only
- **Automated Execution**: Reduces human intervention and potential manipulation
- **Transparent Rewards**: All transactions visible on blockchain

## 🗄️ Database Schema (MongoDB)

```javascript
// Campaign metadata (off-chain)
Campaign: {
  blockchainId: Number (unique, indexed),
  title: String,
  description: String,
  requirements: String,
  createdAt: Date,
  updatedAt: Date
}

// Influencer profiles
Influencer: {
  walletAddress: String (unique, indexed, lowercase),
  youtubeChannelId: String,
  youtubeChannelName: String,
  email: String,
  createdAt: Date
}

// Video submissions and analytics
Submission: {
  campaignId: Number (indexed),
  influencerId: ObjectId (ref: Influencer),
  youtubeVideoId: String (indexed),
  youtubeUrl: String,
  submittedAt: Date,
  lastAnalyticsUpdate: Date,
  viewCount: Number,
  likeCount: Number,
  commentCount: Number,
  performanceScore: Number (indexed)
}
```

## 🐛 Troubleshooting

### Common Issues

1. **MetaMask Connection Issues**
   - Ensure you're on Base Sepolia network
   - Clear browser cache and reconnect wallet

2. **Transaction Failures**
   - Check you have sufficient Base Sepolia ETH
   - Increase gas limit if needed

3. **YouTube API Issues**
   - Verify API key is correct and enabled
   - Check API quotas in Google Cloud Console

4. **Video Submission Errors**
   - Ensure video is public on YouTube
   - Use full YouTube URL format

### Logs and Debugging

```bash
# View backend logs
npm run dev

# Check MongoDB connection
# Visit http://localhost:3001/api/health

# Access MongoDB directly
mongosh campayn  # For local MongoDB
# Or use MongoDB Compass GUI tool
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Base Sepolia Explorer](https://sepolia.basescan.org)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [MetaMask Documentation](https://docs.metamask.io/)

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review GitHub issues
3. Create a new issue with detailed description

---

Built with ❤️ for the decentralized creator economy