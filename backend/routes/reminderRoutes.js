const express = require('express');
const mongoose = require('mongoose');
const Reminder = require('../models/Reminder');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ status: 'Pending' }).sort({ dueDate: 1 });
    res.json(reminders);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid reminder ID.' });
    }
    if (req.body.status !== 'Completed') {
      return res.status(400).json({ message: 'Only status "Completed" is supported.' });
    }
    const reminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      { status: 'Completed' },
      { new: true, runValidators: true },
    );
    if (!reminder) return res.status(404).json({ message: 'Reminder not found.' });
    res.json(reminder);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
