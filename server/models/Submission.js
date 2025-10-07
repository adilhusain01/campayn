import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  campaignId: {
    type: Number,
    required: true
  },
  influencerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: true
  },
  youtubeVideoId: {
    type: String,
    required: true,
    trim: true
  },
  youtubeUrl: {
    type: String,
    required: true,
    trim: true
  },
  lastAnalyticsUpdate: {
    type: Date,
    default: Date.now
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  likeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  commentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  performanceScore: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
submissionSchema.index({ campaignId: 1, performanceScore: -1 });
submissionSchema.index({ campaignId: 1, createdAt: -1 });
submissionSchema.index({ influencerId: 1, createdAt: -1 });
submissionSchema.index({ lastAnalyticsUpdate: 1 });

// Virtual for populated influencer data
submissionSchema.virtual('influencer', {
  ref: 'Influencer',
  localField: 'influencerId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
submissionSchema.set('toJSON', { virtuals: true });
submissionSchema.set('toObject', { virtuals: true });

export default mongoose.model('Submission', submissionSchema);