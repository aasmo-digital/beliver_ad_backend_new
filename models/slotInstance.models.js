// models/slotInstanceModel.js
const mongoose = require('mongoose');

const slotInstanceSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: String,
  email: String,
  role: String,
  status: { type: String, enum: ['Booked', 'Available'], default: 'Available' },
  duration: Number,
  totalSlots: Number,
  peakSlots: Number,
  normalSlots: Number,
  estimateReach: String,
  totalBudgets: String,
  campaignName: String,
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timeslots' },
  timeslotName: String,
  amount: String,
  mediaFile: String,
  url: String,
  location: String,
  locationAddress: String,
  slotType: { type: String, enum: ['Normal', 'Peak'] },
  slotDate: Date,
  slotStartTime: String,
  slotIndexNumber: Number,
  hourId: String,
  minId: Number,
  slotId: String,
  uid: String,
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Assuming your dataUserModels schema is named 'DataUser' or similar when mongoose.model is called
  campaignBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataUser', // Or the correct model name for dataUserModels
    // required: true, // Consider if a slot instance MUST belong to a campaign booking
    index: true
  },
});

module.exports = mongoose.model('SlotInstance', slotInstanceSchema);