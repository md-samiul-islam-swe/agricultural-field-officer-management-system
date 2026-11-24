const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  canonicalName: { type: String, required: true, trim: true, index: true },
  aliases: { type: [String], default: [] },
  plot: { type: String, default: '', trim: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Farmer', farmerSchema);
