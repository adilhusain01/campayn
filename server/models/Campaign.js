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
  }
}, {
  timestamps: true
});

campaignSchema.index({ createdAt: -1 });

export default mongoose.model('Campaign', campaignSchema);