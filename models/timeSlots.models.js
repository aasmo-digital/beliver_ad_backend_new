const mongoose = require('mongoose');

const timeSlotsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: String, required: true },

},{timestamps:true});

module.exports = mongoose.model('TimeSlots', timeSlotsSchema);
