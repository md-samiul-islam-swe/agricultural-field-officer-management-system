const assert = require('assert');
const { buildReport } = require('./report');
const { parseNote } = require('./parser');
let r = buildReport([], []);
assert.deepStrictEqual(r.summary, { totalVisits: 0, uniqueFarms: 0, issuesFound: 0, healthyVisits: 0, followUps: 0, pending: 0, completed: 0 });
r = buildReport([{ farmerId: 'a', isHealthyVisit: false, crop: 'rice', problem: 'yellowing', advice: 'urea' },
  { farmerId: 'b', isHealthyVisit: true, crop: 'potato' }, { farmerId: 'a', isHealthyVisit: true }], [{ status: 'Pending' }, { status: 'Completed' }]);
assert.strictEqual(r.summary.totalVisits, 3); assert.strictEqual(r.summary.healthyVisits, 2);
assert.strictEqual(r.summary.issuesFound, 1); assert.strictEqual(r.summary.uniqueFarms, 2); assert.strictEqual(r.summary.followUps, 2);
assert.strictEqual(parseNote('Rahim, south plot, potato, no problem, everything looks good').isHealthyVisit, true);
console.log('backend tests passed');
