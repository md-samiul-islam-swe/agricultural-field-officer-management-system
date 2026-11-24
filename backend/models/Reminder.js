const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
  farmerName: { type: String, required: true },
  plot: { type: String, default: '' },
  visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', required: true },
  dueDate: { type: Date, required: true, index: true },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending', index: true },
}, { timestamps: true });

module.exports = mongoose.model('Reminder', reminderSchema);
