require('dotenv').config();

module.exports = {
  // Telegram
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  BOT_USERNAME: process.env.BOT_USERNAME || 'TarotReaderBot',

  // Admin IDs (bypass payment for testing)
  ADMIN_TELEGRAM_IDS: (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number),

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,

  // Gemini
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,

  // Pricing (Telegram Stars)
  PRICE_QUICK_READING: parseInt(process.env.PRICE_QUICK_READING || '25'),
  PRICE_DEEP_READING: parseInt(process.env.PRICE_DEEP_READING || '25'),
  PRICE_FOLLOW_UP: parseInt(process.env.PRICE_FOLLOW_UP || '25'),

  // Card Mechanics
  REVERSAL_CHANCE: parseFloat(process.env.REVERSAL_CHANCE || '0.30'),
  FLOWN_CHANCE: parseFloat(process.env.FLOWN_CHANCE || '0.10'),

  // Reading Types
  READING_TYPES: {
    DAILY: 'daily',
    YES_NO: 'yes_no',
    PPF: 'ppf',          // Past, Present, Future
    LOVE: 'love',
    CAREER: 'career',
  },

  // Card counts per reading type
  CARD_COUNTS: {
    daily: 1,
    yes_no: 1,
    ppf: 3,
    love: 3,
    career: 3,
  },

  // Deep reading card count
  DEEP_CARD_COUNT: 5,

  // Follow-up card range
  FOLLOW_UP_CARDS: { min: 1, max: 3 },

  // Reader personas
  READERS: [
    {
      id: 'elara_moonweaver',
      name: '🌙 Elara Moonweaver',
      description: 'Ethereal & spiritual. Connects you to the cosmos.',
      style: 'empathetic, intuitive, uses metaphors relating to the stars and the universe, ethereal, ancient, calming, deeply spiritual',
      image: './Character/Elara_Moonweaver.png',
    },
    {
      id: 'aura_assistant',
      name: '🤖 A.U.R.A.',
      description: 'Algorithmic Universal Reading Assistant. Analytical & precise.',
      style: 'analytical, precise, views tarot as algorithmic reflection of human probability and psychology, sleek, modern, highly intelligent, objective',
      image: './Character/A.U.R.A. (Algorithmic Universal Reading Assistant).png',
    },
    {
      id: 'silas_thorne',
      name: '🌿 Silas Thorne',
      description: 'Grounded & practical. A trusted friend and mentor.',
      style: 'trusted friend, wise mentor, grounded, comforting, focuses on practical real-world advice rooted in nature and the present moment, warm, natural, inviting',
      image: './Character/Silas_Thorne.png',
    },
  ],
};
