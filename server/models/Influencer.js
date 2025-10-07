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
  }
}, {
  timestamps: true
});

influencerSchema.index({ youtubeChannelId: 1 });

export default mongoose.model('Influencer', influencerSchema);