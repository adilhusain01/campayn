import mongoose from 'mongoose';

const influencerSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  youtubeChannelId: {
    type: String,
    required: false,
    trim: true
  },
  youtubeChannelName: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true
  },
  isChannelVerified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['video_description', 'channel_banner', 'video_title'],
    required: false
  },
  verificationCode: {
    type: String,
    required: false
  },
  verificationDate: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

influencerSchema.index({ youtubeChannelId: 1 });

export default mongoose.model('Influencer', influencerSchema);