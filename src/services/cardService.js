/**
 * Card Draw Mechanics
 * Handles shuffling, drawing, reversal probability, and jumper (flown) cards
 */

const config = require('../config');
const { FULL_DECK } = require('../data/tarotDeck');

/**
 * Fisher-Yates shuffle — fair, unbiased randomization
 * @param {Array} array
 * @returns {Array} shuffled copy
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Draw cards with reversal and jumper mechanics
 * @param {number} count - Number of cards to draw
 * @param {string} readingType - Type of reading for position labeling
 * @returns {Object} { cards: Array, hasJumper: boolean }
 */
function drawCards(count, readingType = 'general') {
  const shuffled = shuffle(FULL_DECK);
  const drawnCards = [];
  let hasJumper = false;

  // Check for jumper (flown) card — happens before the main draw
  const jumperRoll = Math.random();
  if (jumperRoll < config.FLOWN_CHANCE) {
    hasJumper = true;
    const jumperCard = shuffled.pop();
    const jumperReversed = Math.random() < config.REVERSAL_CHANCE;
    drawnCards.push({
      card: jumperCard,
      is_reversed: jumperReversed,
      is_jumper: true,
      position: 'jumper',
    });
  }

  // Draw the main cards
  for (let i = 0; i < count; i++) {
    const card = shuffled[i];
    const isReversed = Math.random() < config.REVERSAL_CHANCE;
    drawnCards.push({
      card: card,
      is_reversed: isReversed,
      is_jumper: false,
      position: getPositionName(readingType, i),
    });
  }

  return { cards: drawnCards, hasJumper };
}

/**
 * Draw cards for a follow-up reading
 * @returns {Object} { cards: Array, hasJumper: boolean }
 */
function drawFollowUpCards() {
  const { min, max } = config.FOLLOW_UP_CARDS;
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  return drawCards(count, 'followup');
}

/**
 * Get position name for card placement
 */
function getPositionName(readingType, index) {
  const positions = {
    ppf: ['past', 'present', 'future', 'hidden_influence', 'potential'],
    love: ['your_energy', 'their_energy', 'connection', 'hidden_influence', 'potential'],
    career: ['current_situation', 'challenges', 'outcome', 'hidden_influence', 'potential'],
    yes_no: ['answer'],
    daily: ['daily_guidance'],
    followup: ['followup_1', 'followup_2', 'followup_3'],
  };

  const typePositions = positions[readingType] || [];
  return typePositions[index] || `card_${index + 1}`;
}

/**
 * Serialize cards for database storage
 * @param {Array} cards - Array of drawn card objects
 * @returns {Array} Serializable card data
 */
function serializeCards(cards) {
  return cards.map((c) => ({
    id: c.card.id,
    name: c.card.name,
    filename: c.card.filename,
    is_reversed: c.is_reversed,
    is_jumper: c.is_jumper,
    position: c.position,
    arcana: c.card.arcana,
    suit: c.card.suit,
  }));
}

/**
 * Deserialize cards from database, reattaching full card data
 * @param {Array} serialized - Serialized card array from DB
 * @returns {Array} Full card objects
 */
function deserializeCards(serialized) {
  return serialized.map((s) => {
    const card = FULL_DECK.find((c) => c.id === s.id);
    return {
      card: card,
      is_reversed: s.is_reversed,
      is_jumper: s.is_jumper,
      position: s.position,
    };
  });
}

module.exports = {
  drawCards,
  drawFollowUpCards,
  serializeCards,
  deserializeCards,
  shuffle,
};
