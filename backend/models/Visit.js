const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
  farmerName: { type: String, required: true, trim: true },
  plot: { type: String, default: '', trim: true },
  visitDate: { type: Date, default: Date.now, index: true },
  crop: { type: String, default: '' },
  problem: { type: String, default: '' },
  advice: { type: String, default: '' },
  isHealthyVisit: { type: Boolean, default: false },
  rawNote: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);
