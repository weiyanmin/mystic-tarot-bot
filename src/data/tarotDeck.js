/**
 * Complete 78-card Rider-Waite Tarot Deck
 * Each card has: id, name, arcana, suit, filename, upright/reversed keywords
 */

const MAJOR_ARCANA = [
  { id: 0, name: 'The Fool', arcana: 'major', suit: null, filename: '00-TheFool.png', upright: 'New beginnings, innocence, spontaneity, free spirit', reversed: 'Recklessness, risk-taking, naivety, holding back' },
  { id: 1, name: 'The Magician', arcana: 'major', suit: null, filename: '01-TheMagician.png', upright: 'Manifestation, resourcefulness, power, inspired action', reversed: 'Manipulation, poor planning, untapped talents' },
  { id: 2, name: 'The High Priestess', arcana: 'major', suit: null, filename: '02-TheHighPriestess.png', upright: 'Intuition, sacred knowledge, divine feminine, subconscious', reversed: 'Secrets, withdrawal, silence, disconnected from intuition' },
  { id: 3, name: 'The Empress', arcana: 'major', suit: null, filename: '03-TheEmpress.png', upright: 'Femininity, beauty, nature, nurturing, abundance', reversed: 'Creative block, dependence, emptiness, smothering' },
  { id: 4, name: 'The Emperor', arcana: 'major', suit: null, filename: '04-TheEmperor.png', upright: 'Authority, establishment, structure, father figure', reversed: 'Tyranny, rigidity, coldness, domination' },
  { id: 5, name: 'The Hierophant', arcana: 'major', suit: null, filename: '05-TheHierophant.png', upright: 'Spiritual wisdom, tradition, conformity, institutions', reversed: 'Personal beliefs, freedom, challenging the status quo' },
  { id: 6, name: 'The Lovers', arcana: 'major', suit: null, filename: '06-TheLovers.png', upright: 'Love, harmony, relationships, alignment, choices', reversed: 'Self-love, disharmony, imbalance, misalignment' },
  { id: 7, name: 'The Chariot', arcana: 'major', suit: null, filename: '07-TheChariot.png', upright: 'Control, willpower, success, determination, action', reversed: 'Self-discipline lacking, opposition, lack of direction' },
  { id: 8, name: 'Strength', arcana: 'major', suit: null, filename: '08-Strength.png', upright: 'Courage, inner strength, compassion, influence', reversed: 'Self-doubt, weakness, insecurity, raw emotion' },
  { id: 9, name: 'The Hermit', arcana: 'major', suit: null, filename: '09-TheHermit.png', upright: 'Soul searching, introspection, solitude, inner guidance', reversed: 'Isolation, loneliness, withdrawal, lost' },
  { id: 10, name: 'Wheel of Fortune', arcana: 'major', suit: null, filename: '10-WheelOfFortune.png', upright: 'Good luck, karma, life cycles, destiny, turning point', reversed: 'Bad luck, resistance to change, breaking cycles' },
  { id: 11, name: 'Justice', arcana: 'major', suit: null, filename: '11-Justice.png', upright: 'Justice, fairness, truth, law, cause and effect', reversed: 'Unfairness, lack of accountability, dishonesty' },
  { id: 12, name: 'The Hanged Man', arcana: 'major', suit: null, filename: '12-TheHangedMan.png', upright: 'Pause, surrender, letting go, new perspectives', reversed: 'Delays, resistance, stalling, indecision' },
  { id: 13, name: 'Death', arcana: 'major', suit: null, filename: '13-Death.png', upright: 'Endings, change, transformation, transition', reversed: 'Resistance to change, personal transformation, inner purging' },
  { id: 14, name: 'Temperance', arcana: 'major', suit: null, filename: '14-Temperance.png', upright: 'Balance, moderation, patience, purpose, meaning', reversed: 'Imbalance, excess, self-healing, realignment' },
  { id: 15, name: 'The Devil', arcana: 'major', suit: null, filename: '15-TheDevil.png', upright: 'Shadow self, attachment, addiction, restriction', reversed: 'Releasing limiting beliefs, exploring dark thoughts, detachment' },
  { id: 16, name: 'The Tower', arcana: 'major', suit: null, filename: '16-TheTower.png', upright: 'Sudden change, upheaval, chaos, revelation, awakening', reversed: 'Personal transformation, fear of change, averting disaster' },
  { id: 17, name: 'The Star', arcana: 'major', suit: null, filename: '17-TheStar.png', upright: 'Hope, faith, purpose, renewal, spirituality', reversed: 'Lack of faith, despair, discouragement, insecurity' },
  { id: 18, name: 'The Moon', arcana: 'major', suit: null, filename: '18-TheMoon.png', upright: 'Illusion, fear, anxiety, subconscious, intuition', reversed: 'Release of fear, repressed emotion, inner confusion' },
  { id: 19, name: 'The Sun', arcana: 'major', suit: null, filename: '19-TheSun.png', upright: 'Positivity, fun, warmth, success, vitality', reversed: 'Inner child, feeling down, overly optimistic' },
  { id: 20, name: 'Judgement', arcana: 'major', suit: null, filename: '20-Judgement.png', upright: 'Judgement, rebirth, inner calling, absolution', reversed: 'Self-doubt, inner critic, ignoring the call' },
  { id: 21, name: 'The World', arcana: 'major', suit: null, filename: '21-TheWorld.png', upright: 'Completion, accomplishment, travel, integration', reversed: 'Incompletion, shortcuts, delays, seeking closure' },
];

const SUITS = ['Cups', 'Pentacles', 'Swords', 'Wands'];
const COURT_NAMES = { 11: 'Page', 12: 'Knight', 13: 'Queen', 14: 'King' };

const SUIT_MEANINGS = {
  Cups: {
    element: 'Water',
    theme: 'Emotions, relationships, feelings, creativity',
    cards: [
      { rank: 1, name: 'Ace of Cups', upright: 'Love, new feelings, emotional awakening, creativity', reversed: 'Emptiness, emotional loss, blocked creativity, feeling unloved' },
      { rank: 2, name: 'Two of Cups', upright: 'Unified love, partnership, mutual attraction', reversed: 'Self-love, breakups, disharmony, distrust' },
      { rank: 3, name: 'Three of Cups', upright: 'Celebration, friendship, creativity, community', reversed: 'Independence, alone time, overindulgence, gossip' },
      { rank: 4, name: 'Four of Cups', upright: 'Meditation, contemplation, apathy, re-evaluation', reversed: 'Sudden awareness, choosing happiness, acceptance' },
      { rank: 5, name: 'Five of Cups', upright: 'Regret, failure, disappointment, pessimism', reversed: 'Personal setbacks, self-forgiveness, moving on' },
      { rank: 6, name: 'Six of Cups', upright: 'Revisiting the past, childhood memories, innocence', reversed: 'Living in the past, forgiveness, lacking playfulness' },
      { rank: 7, name: 'Seven of Cups', upright: 'Opportunities, choices, wishful thinking, illusion', reversed: 'Alignment, personal values, overwhelmed by choices' },
      { rank: 8, name: 'Eight of Cups', upright: 'Disappointment, abandonment, withdrawal, escapism', reversed: 'Trying one more time, indecision, aimless drifting' },
      { rank: 9, name: 'Nine of Cups', upright: 'Contentment, satisfaction, gratitude, wish fulfilled', reversed: 'Inner happiness, materialism, dissatisfaction, indulgence' },
      { rank: 10, name: 'Ten of Cups', upright: 'Divine love, blissful relationships, harmony, alignment', reversed: 'Disconnection, misaligned values, struggling relationships' },
      { rank: 11, name: 'Page of Cups', upright: 'Creative opportunity, curiosity, possibility', reversed: 'New idea, doubting intuition, creative blocks, emotional immaturity' },
      { rank: 12, name: 'Knight of Cups', upright: 'Creativity, romance, charm, imagination, beauty', reversed: 'Overactive imagination, unrealistic, jealousy, moodiness' },
      { rank: 13, name: 'Queen of Cups', upright: 'Compassion, calm, comfort, emotional security', reversed: 'Inner feelings, self-care, co-dependency, insecurity' },
      { rank: 14, name: 'King of Cups', upright: 'Emotionally balanced, compassionate, diplomatic', reversed: 'Self-compassion, inner feelings, moodiness, emotionally manipulative' },
    ],
  },
  Pentacles: {
    element: 'Earth',
    theme: 'Material world, career, finances, health',
    cards: [
      { rank: 1, name: 'Ace of Pentacles', upright: 'New financial opportunity, prosperity, abundance', reversed: 'Lost opportunity, lack of planning, scarcity mindset' },
      { rank: 2, name: 'Two of Pentacles', upright: 'Multiple priorities, time management, adaptability', reversed: 'Over-committed, disorganization, reprioritization' },
      { rank: 3, name: 'Three of Pentacles', upright: 'Teamwork, collaboration, learning, implementation', reversed: 'Disharmony, misalignment, working alone, lack of teamwork' },
      { rank: 4, name: 'Four of Pentacles', upright: 'Saving money, security, conservatism, scarcity', reversed: 'Over-spending, greed, self-protection, financial insecurity' },
      { rank: 5, name: 'Five of Pentacles', upright: 'Financial loss, poverty, lack mindset, isolation', reversed: 'Recovery from loss, spiritual poverty, overcoming adversity' },
      { rank: 6, name: 'Six of Pentacles', upright: 'Giving, receiving, sharing wealth, generosity', reversed: 'Self-care, unpaid debts, one-sided charity' },
      { rank: 7, name: 'Seven of Pentacles', upright: 'Long-term view, sustainable results, perseverance', reversed: 'Lack of vision, limited success, impatience' },
      { rank: 8, name: 'Eight of Pentacles', upright: 'Apprenticeship, repetitive tasks, mastery, skill development', reversed: 'Self-development, perfectionism, misdirected activity' },
      { rank: 9, name: 'Nine of Pentacles', upright: 'Abundance, luxury, self-sufficiency, financial independence', reversed: 'Self-worth, over-investment, hustling, superficial' },
      { rank: 10, name: 'Ten of Pentacles', upright: 'Wealth, financial security, family, long-term success', reversed: 'Financial failure, loneliness, loss, dark side of wealth' },
      { rank: 11, name: 'Page of Pentacles', upright: 'Manifestation, financial opportunity, skill development', reversed: 'Lack of progress, procrastination, learn from failure' },
      { rank: 12, name: 'Knight of Pentacles', upright: 'Hard work, productivity, routine, conservatism', reversed: 'Self-discipline, boredom, feeling stuck, perfectionism' },
      { rank: 13, name: 'Queen of Pentacles', upright: 'Nurturing, practical, providing financially, working parent', reversed: 'Financial independence, self-care, work-home conflict' },
      { rank: 14, name: 'King of Pentacles', upright: 'Wealth, business, leadership, security, discipline', reversed: 'Financially inept, obsessed with wealth, stubborn' },
    ],
  },
  Swords: {
    element: 'Air',
    theme: 'Thoughts, words, actions, conflict, intellect',
    cards: [
      { rank: 1, name: 'Ace of Swords', upright: 'Breakthrough, clarity, sharp mind, new idea', reversed: 'Inner clarity, re-thinking, clouded judgement' },
      { rank: 2, name: 'Two of Swords', upright: 'Difficult decisions, weighing options, an impasse', reversed: 'Indecision, confusion, information overload, no right choice' },
      { rank: 3, name: 'Three of Swords', upright: 'Heartbreak, emotional pain, sorrow, grief, hurt', reversed: 'Recovery, forgiveness, moving on, releasing pain' },
      { rank: 4, name: 'Four of Swords', upright: 'Rest, relaxation, meditation, contemplation, recuperation', reversed: 'Exhaustion, burn-out, deep contemplation, stagnation' },
      { rank: 5, name: 'Five of Swords', upright: 'Conflict, disagreements, competition, defeat, winning at all costs', reversed: 'Reconciliation, making amends, past resentment' },
      { rank: 6, name: 'Six of Swords', upright: 'Transition, change, rite of passage, releasing baggage', reversed: 'Personal transition, resistance to change, unfinished business' },
      { rank: 7, name: 'Seven of Swords', upright: 'Betrayal, deception, getting away with something, stealth', reversed: 'Imposter syndrome, self-deceit, keeping secrets' },
      { rank: 8, name: 'Eight of Swords', upright: 'Negative thoughts, self-imposed restriction, imprisonment', reversed: 'Self-acceptance, new perspective, freedom, release' },
      { rank: 9, name: 'Nine of Swords', upright: 'Anxiety, worry, fear, depression, nightmares', reversed: 'Inner turmoil, deep-seated fears, release worry, hope' },
      { rank: 10, name: 'Ten of Swords', upright: 'Painful endings, deep wounds, betrayal, loss, crisis', reversed: 'Recovery, regeneration, resisting an inevitable end' },
      { rank: 11, name: 'Page of Swords', upright: 'New ideas, curiosity, thirst for knowledge, new communication', reversed: 'Self-expression, all talk no action, haphazard, cynical' },
      { rank: 12, name: 'Knight of Swords', upright: 'Ambitious, action-oriented, driven to succeed, fast-thinking', reversed: 'Restless, unfocused, impulsive, burn-out' },
      { rank: 13, name: 'Queen of Swords', upright: 'Independent, unbiased judgement, clear boundaries, direct', reversed: 'Overly emotional, easily influenced, bitchy, cold-hearted' },
      { rank: 14, name: 'King of Swords', upright: 'Mental clarity, intellectual power, authority, truth', reversed: 'Inner truth, misuse of power, manipulation, cruelty' },
    ],
  },
  Wands: {
    element: 'Fire',
    theme: 'Inspiration, energy, creativity, passion, ambition',
    cards: [
      { rank: 1, name: 'Ace of Wands', upright: 'Inspiration, new opportunity, growth, potential', reversed: 'Emerging idea, lack of direction, distractions, delays' },
      { rank: 2, name: 'Two of Wands', upright: 'Future planning, progress, decisions, discovery', reversed: 'Personal goals, inner alignment, fear of unknown, lack of planning' },
      { rank: 3, name: 'Three of Wands', upright: 'Progress, expansion, foresight, overseas opportunities', reversed: 'Playing small, lack of foresight, unexpected delays' },
      { rank: 4, name: 'Four of Wands', upright: 'Celebration, joy, harmony, relaxation, homecoming', reversed: 'Personal celebration, inner harmony, conflict with others' },
      { rank: 5, name: 'Five of Wands', upright: 'Conflict, disagreements, competition, tension, diversity', reversed: 'Inner conflict, conflict avoidance, release of tension' },
      { rank: 6, name: 'Six of Wands', upright: 'Success, public recognition, progress, self-confidence', reversed: 'Private achievement, personal definition of success, fall from grace' },
      { rank: 7, name: 'Seven of Wands', upright: 'Challenge, competition, protection, perseverance', reversed: 'Exhaustion, giving up, overwhelmed, defensive' },
      { rank: 8, name: 'Eight of Wands', upright: 'Movement, fast paced change, action, alignment, air travel', reversed: 'Delays, frustration, resisting change, internal alignment' },
      { rank: 9, name: 'Nine of Wands', upright: 'Resilience, courage, persistence, test of faith, boundaries', reversed: 'Inner resources, struggle, overwhelm, defensive, paranoia' },
      { rank: 10, name: 'Ten of Wands', upright: 'Burden, extra responsibility, hard work, completion', reversed: 'Doing it all, carrying the burden, delegation, release' },
      { rank: 11, name: 'Page of Wands', upright: 'Inspiration, ideas, discovery, limitless potential, free spirit', reversed: 'Newly-formed ideas, redirect your energy, self-limiting beliefs' },
      { rank: 12, name: 'Knight of Wands', upright: 'Energy, passion, inspired action, adventure, impulsiveness', reversed: 'Passion project, haste, scattered energy, delays, frustration' },
      { rank: 13, name: 'Queen of Wands', upright: 'Courage, confidence, independence, social butterfly, determination', reversed: 'Self-respect, self-confidence, introverted, re-establish sense of self' },
      { rank: 14, name: 'King of Wands', upright: 'Natural-born leader, vision, entrepreneur, honour', reversed: 'Impulsiveness, haste, ruthless, high expectations' },
    ],
  },
};

// Build the minor arcana array from suit definitions
const MINOR_ARCANA = [];
for (const suit of SUITS) {
  const suitData = SUIT_MEANINGS[suit];
  for (const card of suitData.cards) {
    const paddedRank = String(card.rank).padStart(2, '0');
    MINOR_ARCANA.push({
      id: 22 + MINOR_ARCANA.length,
      name: card.name,
      arcana: 'minor',
      suit: suit.toLowerCase(),
      filename: `${suit}${paddedRank}.png`,
      upright: card.upright,
      reversed: card.reversed,
    });
  }
}

// Full 78-card deck
const FULL_DECK = [...MAJOR_ARCANA, ...MINOR_ARCANA];

module.exports = {
  MAJOR_ARCANA,
  MINOR_ARCANA,
  FULL_DECK,
  SUIT_MEANINGS,
};
