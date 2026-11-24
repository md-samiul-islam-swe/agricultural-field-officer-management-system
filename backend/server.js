require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.use('/api', require('./routes/historyAndReminderRoutes'));
app.use('/api/visits', require('./routes/visitRoutes'));
app.use('/api/reminders', require('./routes/reminderRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ message: error.message || 'Internal server error.' });
});

const port = Number(process.env.PORT) || 5000;
connectDB()
  .then(() => app.listen(port, () => console.log(`API listening on port ${port}`)))
  .catch((error) => {
    console.error('Unable to start API:', error.message);
    process.exitCode = 1;
  });
