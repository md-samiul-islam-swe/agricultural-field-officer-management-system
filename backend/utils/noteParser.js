const HEALTHY_PATTERNS = [
  /\bno problem(s)?\b/i,
  /\beverything looks good\b/i,
  /\bhealthy\b/i,
];

function clean(value) {
  return value
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '')
    .replace(/^(and|but|then)\s+/i, '')
    .trim();
}

function extractFollowUpDate(note, now = new Date()) {
  const relative = /\b(?:(?:come back|return|follow[ -]?up|check again|visit again)\s+)?(?:in\s+)?(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|week|month)s?|next\s+(week|month))\b/i;
  const match = note.match(relative);
  if (!match) return null;

  const amounts = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const date = new Date(now);
  const unit = (match[2] || match[3] || '').toLowerCase();
  if (match[3]) {
    if (unit === 'week') date.setDate(date.getDate() + 7);
    else date.setMonth(date.getMonth() + 1);
  } else {
    const count = Number(match[1]) || amounts[match[1].toLowerCase()];
    if (unit === 'day') date.setDate(date.getDate() + count);
    if (unit === 'week') date.setDate(date.getDate() + count * 7);
    if (unit === 'month') date.setMonth(date.getMonth() + count);
  }
  return date;
}

function parseNote(rawNote) {
  const note = String(rawNote || '').trim();
  if (!note) throw new Error('A note is required.');

  const segments = note.split(/[,;\n]+/).map(clean).filter(Boolean);
  const farmerName = clean((segments[0] || '').replace(/^(visited|visit to|farmer)\s+/i, ''));

  const plotMatch = note.match(/\b((?:north|south|east|west|upper|lower|front|back|[a-z0-9-]+)\s+plot)\b/i)
    || note.match(/\bplot\s*(?:is|:)?\s*([a-z0-9 -]+?)(?=,|;|\.|\band\b|\b(?:rice|wheat|maize|corn|potato|tomato|crop)\b|$)/i);
  const plot = clean(plotMatch ? (plotMatch[1].toLowerCase() === 'plot' ? plotMatch[1] : plotMatch[1]) : '');

  const cropMatch = note.match(/\b(rice|paddy|wheat|maize|corn|potato|tomato|chili|chilli|bean|beans|cotton|sugarcane|jute|onion|garlic|brinjal|eggplant|mustard|lentil|crop)\b/i);
  const crop = cropMatch ? cropMatch[1].replace(/^paddy$/i, 'rice').replace(/^corn$/i, 'maize') : '';

  const healthyMatch = HEALTHY_PATTERNS.some((pattern) => pattern.test(note));
  const followUpDate = extractFollowUpDate(note);

  let problem = '';
  let advice = '';
  const adviceMatch = note.match(/\b(?:suggested|advised|recommended|told(?:\s+(?:him|her|them))?|asked(?:\s+(?:him|her|them))?)\s+(.+?)(?=\b(?:come back|return|follow[ -]?up|check again|visit again)\b|$)/i);
  if (adviceMatch) advice = clean(adviceMatch[1]);

  const problemEnd = /\b(?:said|reports?|reported|noticed|observed|suggested|advised|recommended)\b/i;
  const cropEnd = cropMatch ? cropMatch.index + cropMatch[0].length : -1;
  if (cropEnd >= 0) {
    const tail = note.slice(cropEnd);
    const end = tail.search(problemEnd);
    const candidate = end >= 0 ? tail.slice(0, end) : tail;
    problem = clean(candidate);
  }
  if (healthyMatch) problem = '';
  if (followUpDate) {
    problem = clean(problem.replace(/\b(?:come back|return|follow[ -]?up|check again|visit again)\b.*$/i, ''));
  }

  return {
    farmerName,
    plot,
    crop: clean(crop),
    problem,
    advice,
    isHealthyVisit: healthyMatch,
    followUpDate,
  };
}

module.exports = { parseNote, extractFollowUpDate };
