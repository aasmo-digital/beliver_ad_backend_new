const mongoose = require('mongoose');

const mediaUrlSchema = new mongoose.Schema({
  media: {
    data: Buffer,        // file content
    contentType: String, // mime type
    filename: String,
  },
  url: {
    type: String,
    trim: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('MediaUrl', mediaUrlSchema);
 