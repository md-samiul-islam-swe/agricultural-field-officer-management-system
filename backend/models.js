const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const Farmer = model('Farmer', new Schema({
  canonicalName: String, aliases: { type: [String], default: [] }, plot: String, createdAt: { type: Date, default: Date.now } }));
const Visit = model('Visit', new Schema({
  farmerId: { type: Schema.Types.ObjectId, ref: 'Farmer' }, farmerName: String, plot: String,
  visitDate: { type: Date, default: Date.now }, crop: String, problem: String, advice: String,
  isHealthyVisit: { type: Boolean, default: false }, rawNote: String }));
const Reminder = model('Reminder', new Schema({
  farmerId: { type: Schema.Types.ObjectId, ref: 'Farmer' }, farmerName: String, plot: String,
  visitId: { type: Schema.Types.ObjectId, ref: 'Visit' }, dueDate: Date,
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' } }));
module.exports = { Farmer, Visit, Reminder };
