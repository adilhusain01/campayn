import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  blockchainId: {
    type: Number,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: {
    type: String,
    required: true
  },
  // AI Content Verification Settings
  aiVerification: {
    enabled: {
      type: Boolean,
      default: true
    },
    minimumWordCount: {
      type: Number,
      default: 50,
      min: 10,
      max: 1000
    },
    requiredKeywords: [{
      type: String,
      trim: true
    }],
    strictMode: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

campaignSchema.index({ createdAt: -1 });

export default mongoose.model('Campaign', campaignSchema);