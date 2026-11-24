const NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const FOLLOW_UP_PATTERN = /\b(?:in\s+)?(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|week|month)s?|next\s+(week|month))\b/i;

function addMonths(date, months) {
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
}

function parseReminderDate(rawNote, fromDate = new Date()) {
  const match = String(rawNote || '').match(FOLLOW_UP_PATTERN);
  if (!match) return null;

  const date = new Date(fromDate);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('fromDate must be a valid date.');
  }

  if (match[3]) {
    if (match[3].toLowerCase() === 'week') date.setDate(date.getDate() + 7);
    else addMonths(date, 1);
    return date;
  }

  const amount = Number(match[1]) || NUMBER_WORDS[match[1].toLowerCase()];
  const unit = match[2].toLowerCase();
  if (unit === 'day') date.setDate(date.getDate() + amount);
  if (unit === 'week') date.setDate(date.getDate() + amount * 7);
  if (unit === 'month') addMonths(date, amount);
  return date;
}

module.exports = { parseReminderDate };
