const express = require('express');
const Visit = require('../models/Visit');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const monthNumber = Number(month);
    const yearNumber = Number(year);
    if (!/^\d{1,2}$/.test(String(month)) || monthNumber < 1 || monthNumber > 12
        || !/^\d{4}$/.test(String(year)) || yearNumber < 1900 || yearNumber > 9999) {
      return res.status(400).json({ message: 'Provide a valid month (01-12) and year (YYYY).' });
    }

    const start = new Date(Date.UTC(yearNumber, monthNumber - 1, 1));
    const end = new Date(Date.UTC(yearNumber, monthNumber, 1));
    const visits = await Visit.find({ visitDate: { $gte: start, $lt: end } }).sort({ visitDate: -1 });
    const healthyCount = visits.filter((visit) => visit.isHealthyVisit).length;
    const issueCount = visits.filter((visit) => !visit.isHealthyVisit && Boolean(visit.problem)).length;

    res.json({
      month: monthNumber,
      year: yearNumber,
      totalVisits: visits.length,
      issueCount,
      healthyCount,
      visits,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
