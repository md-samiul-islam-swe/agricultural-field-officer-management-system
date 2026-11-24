const similarity = require('string-similarity');
const Farmer = require('../models/Farmer');

const THRESHOLD = 0.7;

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function nameScore(incoming, knownNames) {
  const normalizedIncoming = normalize(incoming);
  const incomingTokens = normalizedIncoming.split(' ').filter(Boolean);
  let best = 0;

  for (const known of knownNames) {
    const normalizedKnown = normalize(known);
    if (!normalizedKnown) continue;
    best = Math.max(best, similarity.compareTwoStrings(normalizedIncoming, normalizedKnown));
    const knownTokens = normalizedKnown.split(' ').filter(Boolean);
    const shorter = incomingTokens.length <= knownTokens.length ? incomingTokens : knownTokens;
    const longer = incomingTokens.length > knownTokens.length ? incomingTokens : knownTokens;
    if (shorter.length && shorter.every((token) => longer.includes(token))) best = Math.max(best, 1);
  }
  return best;
}

async function findMatchingFarmer(farmerName, plot) {
  const name = normalize(farmerName);
  if (!name) return null;

  const farmers = await Farmer.find({});
  let bestFarmer = null;
  let bestScore = 0;

  for (const farmer of farmers) {
    const score = nameScore(name, [farmer.canonicalName, ...farmer.aliases]);
    if (score < THRESHOLD) continue;

    if (normalize(plot)) {
      const knownPlot = normalize(farmer.plot);
      const plotScore = knownPlot ? similarity.compareTwoStrings(normalize(plot), knownPlot) : 0;
      if (knownPlot && plotScore < THRESHOLD) continue;
    }
    if (score > bestScore) {
      bestFarmer = farmer;
      bestScore = score;
    }
  }
  return bestFarmer;
}

async function resolveFarmer(farmerName, plot) {
  let farmer = await findMatchingFarmer(farmerName, plot);
  if (!farmer) {
    farmer = await Farmer.create({
      canonicalName: farmerName.trim(),
      aliases: [],
      plot: (plot || '').trim(),
    });
    return farmer;
  }

  const incomingName = farmerName.trim();
  if (incomingName !== farmer.canonicalName && !farmer.aliases.includes(incomingName)) {
    farmer.aliases.push(incomingName);
  }
  if (!farmer.plot && plot) farmer.plot = plot.trim();
  await farmer.save();
  return farmer;
}

module.exports = { findMatchingFarmer, resolveFarmer, THRESHOLD };
