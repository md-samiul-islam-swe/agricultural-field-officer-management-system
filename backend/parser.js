const NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const CROPS = ['rice','paddy','wheat','corn','maize','potato','tomato','jute','sugarcane','chili','chilli','mustard','lentil','onion','brinjal','cabbage','cauliflower','banana','mango'];
const HEALTHY = /\b(no problems?|everything looks good|healthy|no issues?|all good|looks fine)\b/i;
const ADVICE = /\b(suggest|advis|recommend|apply|top.?dress|spray|irrigat|use|should|try|add)/i;
const FOLLOW = /\b(come back|revisit|follow.?up|visit again|return|check again)\b/i;
const TIME = /\b(?:in|after)\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|week|month)s?\b/i;

function parseFollowUp(text, base = new Date()) {
  const d = new Date(base);
  let m = text.match(TIME);
  if (m) {
    const n = NUM[m[1].toLowerCase()] ?? parseInt(m[1], 10), u = m[2].toLowerCase();
    if (u === 'day') d.setDate(d.getDate() + n);
    else if (u === 'week') d.setDate(d.getDate() + 7 * n);
    else d.setMonth(d.getMonth() + n);
    return d;
  }
  if ((m = text.match(/\bnext\s+(week|month)\b/i))) {
    m[1].toLowerCase() === 'week' ? d.setDate(d.getDate() + 7) : d.setMonth(d.getMonth() + 1);
    return d;
  }
  if (/\btomorrow\b/i.test(text)) { d.setDate(d.getDate() + 1); return d; }
  return null;
}

function parseNote(raw, base = new Date()) {
  const rawNote = (raw || '').trim();
  const segs = rawNote.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const farmerName = (segs[0] || '').toLowerCase().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const plotM = rawNote.match(/\b([a-z]+)\s+plot\b/i);
  const plot = plotM ? `${plotM[1].toLowerCase()} plot` : '';
  const cropM = rawNote.match(new RegExp(`\\b(${CROPS.join('|')})\\b`, 'i'));
  const crop = cropM ? cropM[1].toLowerCase() : '';
  const followUpDate = parseFollowUp(rawNote, base);
  const problems = [], advices = [];
  segs.slice(1).forEach(s => {
    const l = s.toLowerCase();
    if (/^\w+\s+plot$/.test(l) || CROPS.includes(l)) return;
    if (HEALTHY.test(s)) return;
    if (FOLLOW.test(s) || (TIME.test(s) && s.split(/\s+/).length <= 6)) return;
    (ADVICE.test(s) ? advices : problems).push(s);
  });
  const problem = problems.join('; '), advice = advices.join('; ');
  const isHealthyVisit = HEALTHY.test(rawNote) || !problem;
  return { farmerName, plot, crop, problem: isHealthyVisit ? '' : problem, advice, isHealthyVisit, followUpDate, rawNote };
}
module.exports = { parseNote, parseFollowUp };
