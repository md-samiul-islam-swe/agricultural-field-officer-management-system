// Pure aggregation: safe for 0 visits and missing optional fields.
const tally = arr => Object.entries((arr || []).filter(Boolean).reduce((m, k) => {
  const key = String(k).trim().toLowerCase(); if (key) m[key] = (m[key] || 0) + 1; return m; }, {}))
  .sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

function buildReport(visits = [], reminders = []) {
  const healthy = visits.filter(v => v.isHealthyVisit).length;
  return {
    summary: {
      totalVisits: visits.length,
      uniqueFarms: new Set(visits.map(v => String(v.farmerId || v.farmerName || v._id))).size,
      issuesFound: visits.length - healthy, healthyVisits: healthy,
      followUps: reminders.length,
      pending: reminders.filter(r => r.status === 'Pending').length,
      completed: reminders.filter(r => r.status === 'Completed').length },
    crops: tally(visits.map(v => v.crop)),
    problems: tally(visits.filter(v => !v.isHealthyVisit).map(v => v.problem)),
    advice: tally(visits.map(v => v.advice)),
    visits };
}
module.exports = { buildReport };
