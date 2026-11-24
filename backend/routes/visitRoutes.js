const express = require('express');
const Farmer = require('../models/Farmer');
const Visit = require('../models/Visit');
const Reminder = require('../models/Reminder');
const { parseNote } = require('../utils/noteParser');
const { resolveFarmer } = require('../utils/fuzzyMatcher');

const router = express.Router();

router.get('/farmers', async (req, res, next) => {
  try {
    const farmers = await Farmer.find().sort({ canonicalName: 1 });
    res.json(farmers);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const visits = await Visit.find().sort({ visitDate: -1 }).limit(200);
    res.json(visits);
  } catch (error) {
    next(error);
  }
});

router.get('/farmer/:farmerId', async (req, res, next) => {
  try {
    const farmer = await Farmer.findById(req.params.farmerId);
    if (!farmer) return res.status(404).json({ message: 'Farmer not found.' });
    const visits = await Visit.find({ farmerId: farmer._id }).sort({ visitDate: -1 });
    res.json({ farmer, visits });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { rawNote, visitDate } = req.body;
    if (typeof rawNote !== 'string' || !rawNote.trim()) {
      return res.status(400).json({ message: 'rawNote is required.' });
    }

    const parsed = parseNote(rawNote);
    if (!parsed.farmerName) {
      return res.status(400).json({ message: 'Could not identify a farmer name in the note.' });
    }
    const parsedVisitDate = visitDate ? new Date(visitDate) : new Date();
    if (Number.isNaN(parsedVisitDate.getTime())) {
      return res.status(400).json({ message: 'visitDate must be a valid date.' });
    }
    const farmer = await resolveFarmer(parsed.farmerName, parsed.plot);

    const visit = await Visit.create({
      farmerId: farmer._id,
      farmerName: farmer.canonicalName,
      plot: parsed.plot || farmer.plot,
      visitDate: parsedVisitDate,
      crop: parsed.crop,
      problem: parsed.problem,
      advice: parsed.advice,
      isHealthyVisit: parsed.isHealthyVisit,
      rawNote: rawNote.trim(),
    });

    await Reminder.updateMany(
      { farmerId: farmer._id, status: 'Pending' },
      { $set: { status: 'Completed' } },
    );

    let reminder = null;
    if (parsed.followUpDate) {
      reminder = await Reminder.create({
        farmerId: farmer._id,
        farmerName: farmer.canonicalName,
        plot: parsed.plot || farmer.plot,
        visitId: visit._id,
        dueDate: parsed.followUpDate,
        status: 'Pending',
      });
    }
    res.status(201).json({ visit, reminder, parsed });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
