const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  location: { type: String, required: true },
  package: { type: String, required: true },
  city: { type: String },
  dailyReach: { type: String, required: true },
  visiblity: { type: String, required: true },
  maxAmount: { type: Number },
  minAmount: { type: Number },
  peakHoursAmount: { type: Number },
  normalHoursAmount: { type: Number },
  costPerImpression: { type: Number },
  budget: { type: Number },
  fileUrl: { type: String },
  url: { type: String, default: "" },
  ratings: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, min: 1, max: 5 },
    }
  ],
  averageRating: { type: Number, default: 0 },
  slotStartTimes: {
    type: [String],
    default: []
  },
  mediaFiles: [{ type: String }] // Changed from ObjectId to String to store file paths
}, { timestamps: true });

// Export the model
module.exports = mongoose.model('Location', locationSchema);