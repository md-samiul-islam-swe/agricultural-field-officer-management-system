require('dotenv').config(); // must stay first
const dns = require('dns');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const stringSimilarity = require('string-similarity');
const { Farmer, Visit, Reminder } = require('./models');
const { parseNote } = require('./parser');
const { buildReport } = require('./report');

if (process.env.DNS_SERVERS) {
  try { dns.setServers(process.env.DNS_SERVERS.split(',').map(s => s.trim())); console.log('[dns] using', process.env.DNS_SERVERS); }
  catch (e) { console.warn('[dns] could not set DNS servers:', e.message); }
}

const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
// Any other /api call fails clearly (not with a hang) while the database is down.
app.use('/api', (req, res, next) => mongoose.connection.readyState === 1 ? next()
  : res.status(503).json({ error: 'Database is not connected. Check the backend terminal for the MongoDB error.' }));
const wrap = fn => (req, res) => fn(req, res).catch(e => { console.error('[api]', e); res.status(500).json({ error: e.message }); });

function nameScore(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const ta = a.split(' '), tb = b.split(' '), subset = (x, y) => x.every(t => y.includes(t));
  const base = stringSimilarity.compareTwoStrings(a, b);
  return subset(ta, tb) || subset(tb, ta) ? Math.max(base, 0.8) : base;
}
async function findOrCreateFarmer(name, plot) {
  let best = null, bestScore = 0;
  for (const f of await Farmer.find()) {
    if (f.plot && plot && f.plot !== plot) continue;
    const score = Math.max(...[f.canonicalName, ...(f.aliases || [])].map(n => nameScore(name, n || '')));
    if (score > bestScore) { best = f; bestScore = score; }
  }
  if (best && bestScore >= 0.7) {
    if (![best.canonicalName, ...best.aliases].some(n => (n || '').toLowerCase() === name.toLowerCase())) best.aliases.push(name);
    if (!best.plot && plot) best.plot = plot;
    await best.save();
    return best;
  }
  return Farmer.create({ canonicalName: name, aliases: [], plot });
}

app.post('/api/notes', wrap(async (req, res) => {
  const { rawNote, visitDate } = req.body || {};
  if (!rawNote || !rawNote.trim()) return res.status(400).json({ error: 'Note text is required.' });
  const date = visitDate ? new Date(visitDate) : new Date();
  const p = parseNote(rawNote, date);
  if (!p.farmerName) return res.status(400).json({ error: 'Could not find a farmer name. Start the note with the name.' });
  const farmer = await findOrCreateFarmer(p.farmerName, p.plot);
  const completed = await Reminder.updateMany({ farmerId: farmer._id, status: 'Pending' }, { status: 'Completed' });
  const visit = await Visit.create({ farmerId: farmer._id, farmerName: farmer.canonicalName, plot: p.plot || farmer.plot,
    visitDate: date, crop: p.crop, problem: p.problem, advice: p.advice, isHealthyVisit: p.isHealthyVisit, rawNote: p.rawNote });
  let reminder = null;
  if (p.followUpDate) reminder = await Reminder.create({ farmerId: farmer._id, farmerName: farmer.canonicalName,
    plot: visit.plot, visitId: visit._id, dueDate: p.followUpDate, status: 'Pending' });
  res.status(201).json({ visit, farmer, reminder, autoCompleted: completed.modifiedCount, parsed: p });
}));
app.get('/api/farmers', wrap(async (req, res) => res.json(await Farmer.find().sort({ canonicalName: 1 }))));
app.get('/api/farmers/:id/visits', wrap(async (req, res) => res.json(await Visit.find({ farmerId: req.params.id }).sort({ visitDate: -1 }))));
app.get('/api/reminders', wrap(async (req, res) => res.json(await Reminder.find(req.query.status ? { status: req.query.status } : {}).sort({ dueDate: 1 }))));
app.patch('/api/reminders/:id', wrap(async (req, res) => {
  const r = await Reminder.findByIdAndUpdate(req.params.id, { status: 'Completed' }, { new: true });
  r ? res.json(r) : res.status(404).json({ error: 'Reminder not found.' });
}));
app.get('/api/report', wrap(async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1, year = parseInt(req.query.year, 10) || now.getFullYear();
  if (month < 1 || month > 12) return res.status(400).json({ error: 'Month must be 1-12.' });
  const start = new Date(Date.UTC(year, month - 1, 1)), end = new Date(Date.UTC(year, month, 1)); // UTC bounds: no off-by-one
  const visits = await Visit.find({ visitDate: { $gte: start, $lt: end } }).sort({ visitDate: 1 }).lean();
  const reminders = visits.length ? await Reminder.find({ visitId: { $in: visits.map(v => v._id) } }).lean() : [];
  res.json({ month, year, ...buildReport(visits, reminders) });
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[api] listening on http://localhost:${PORT}`));

async function connect() {
  const attempts = [['Atlas (SRV)', process.env.MONGO_URI], ['Atlas (standard)', process.env.MONGO_URI_STANDARD], ['Local MongoDB', process.env.MONGO_URI_LOCAL]].filter(a => a[1]);
  if (!process.env.MONGO_URI) console.error('[db] MONGO_URI is missing. Create backend/.env (see .env in the project).');
  for (const [label, uri] of attempts) {
    try {
      console.log(`[db] connecting to ${label}...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
      console.log(`[db] connected to ${label} (${mongoose.connection.name})`);
      return;
    } catch (e) {
      console.error(`[db] ${label} failed: ${e.message}`);
      if (/querySrv|ENOTFOUND|ECONNREFUSED/.test(e.message)) console.error('[db] DNS/SRV lookup blocked on this network. Try DNS_SERVERS in .env, a different network/VPN, the standard (non-SRV) Atlas string, or local MongoDB.');
      else if (/whitelist|IP|not authorized|ECONNRESET|Server selection/i.test(e.message)) console.error('[db] In Atlas > Network Access, allow your current IP, and check the database user/password.');
      await mongoose.disconnect().catch(() => {});
    }
  }
  console.error('[db] No database reachable. API is up but returns 503 for data routes. Fix the connection and restart.');
}
connect();
