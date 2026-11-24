const express = require('express');
const mongoose = require('mongoose');
const Farmer = require('../models/Farmer');
const Visit = require('../models/Visit');
const Reminder = require('../models/Reminder');
const { resolveFarmer } = require('../utils/fuzzyMatcher');
const { parseReminderDate } = require('../utils/reminderParser');

const router = express.Router();

router.post('/visits/record', async (req, res, next) => {
  try {
    const body = req.body || {};
    const {
      rawNote = '',
      farmerName,
      plot = '',
      crop = '',
      problem = '',
      advice = '',
      isHealthyVisit = false,
    } = body;

    if (typeof farmerName !== 'string' || !farmerName.trim()) {
      return res.status(400).json({ message: 'farmerName is required.' });
    }
    for (const field of ['rawNote', 'plot', 'crop', 'problem', 'advice']) {
      if (typeof body[field] !== 'undefined' && typeof body[field] !== 'string') {
        return res.status(400).json({ message: `${field} must be a string.` });
      }
    }
    if (typeof isHealthyVisit !== 'boolean') {
      return res.status(400).json({ message: 'isHealthyVisit must be a boolean.' });
    }

    const farmer = await resolveFarmer(farmerName, typeof plot === 'string' ? plot : '');
    const visit = await Visit.create({
      farmerId: farmer._id,
      farmerName: farmer.canonicalName,
      plot: (typeof plot === 'string' && plot.trim()) || farmer.plot,
      crop: typeof crop === 'string' ? crop.trim() : '',
      problem: typeof problem === 'string' ? problem.trim() : '',
      advice: typeof advice === 'string' ? advice.trim() : '',
      isHealthyVisit,
      rawNote: rawNote.trim(),
    });

    await Reminder.updateMany(
      { farmerId: farmer._id, status: 'Pending' },
      { $set: { status: 'Completed' } },
    );

    const dueDate = parseReminderDate(rawNote, visit.visitDate);
    const reminder = dueDate
      ? await Reminder.create({
        farmerId: farmer._id,
        farmerName: farmer.canonicalName,
        plot: visit.plot,
        visitId: visit._id,
        dueDate,
        status: 'Pending',
      })
      : null;

    res.status(201).json({ visit, reminder });
  } catch (error) {
    next(error);
  }
});

router.get('/farmers', async (req, res, next) => {
  try {
    const [farmers, visitCounts] = await Promise.all([
      Farmer.find().sort({ canonicalName: 1 }).lean(),
      Visit.aggregate([
        { $group: { _id: '$farmerId', totalVisitCount: { $sum: 1 } } },
      ]),
    ]);
    const countByFarmer = new Map(
      visitCounts.map(({ _id, totalVisitCount }) => [String(_id), totalVisitCount]),
    );
    res.json(farmers.map((farmer) => ({
      ...farmer,
      totalVisitCount: countByFarmer.get(String(farmer._id)) || 0,
    })));
  } catch (error) {
    next(error);
  }
});

router.get('/farmers/:id/history', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid farmer ID.' });
    }
    const farmer = await Farmer.findById(req.params.id);
    if (!farmer) return res.status(404).json({ message: 'Farmer not found.' });

    const visits = await Visit.find({ farmerId: farmer._id })
      .sort({ visitDate: 1, _id: 1 });
    res.json({ farmer, visits });
  } catch (error) {
    next(error);
  }
});

router.get('/reminders', async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ status: 'Pending' }).sort({ dueDate: 1 });
    res.json(reminders);
  } catch (error) {
    next(error);
  }
});

router.patch('/reminders/:id/complete', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid reminder ID.' });
    }
    const reminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'Completed' } },
      { new: true, runValidators: true },
    );
    if (!reminder) return res.status(404).json({ message: 'Reminder not found.' });
    res.json(reminder);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
