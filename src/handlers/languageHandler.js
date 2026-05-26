/**
 * Language Selection Handler
 * Prompts user for language, validates, saves, and falls back to English
 */

const db = require('../services/supabaseService');
const { detectLanguage } = require('../utils/helpers');

/**
 * Prompt the user to type their preferred language
 * @param {Object} bot
 * @param {number} chatId
 * @param {Object} userState - Conversation state tracker
 * @param {number} telegramId
 */
async function promptLanguage(bot, chatId, userState, telegramId) {
  // Check if user already has a saved language
  const user = await db.getUser(telegramId);
  if (user && user.language && user.language !== 'en') {
    // User already has a language preference — skip the prompt
    userState[telegramId].language = user.language;
    return user.language;
  }

  userState[telegramId] = {
    ...userState[telegramId],
    awaitingLanguage: true,
  };

  await bot.sendMessage(chatId,
    '🌍 *What language would you like your reading in?*\n\n' +
    'Type your language (e.g., English, Thai, Spanish, 日本語, ไทย...)\n\n' +
    '_Default: English_',
    { parse_mode: 'Markdown' }
  );

  return null; // Indicates we need to wait for user input
}

/**
 * Process the user's language response
 * @param {Object} bot
 * @param {Object} msg
 * @param {Object} userState
 * @returns {string|null} The resolved language code, or null if invalid
 */
async function processLanguageInput(bot, msg, userState) {
  const telegramId = msg.from.id;
  const chatId = msg.chat.id;
  const input = msg.text?.trim();

  const languageCode = detectLanguage(input);

  if (!languageCode) {
    // Unsupported language — log it and fall back to English
    await db.logLanguageAttempt(telegramId, input, 'en');
    await bot.sendMessage(chatId,
      `⚠️ Sorry, *"${input}"* is not yet supported. Defaulting to *English*.\n` +
      '_Your preference has been logged — we\'re working on adding more languages!_',
      { parse_mode: 'Markdown' }
    );
    userState[telegramId].language = 'en';
    userState[telegramId].awaitingLanguage = false;
    await db.updateUserLanguage(telegramId, 'en');
    return 'en';
  }

  // Save to DB for seamless future interactions
  await db.updateUserLanguage(telegramId, languageCode);
  userState[telegramId].language = languageCode;
  userState[telegramId].awaitingLanguage = false;

  const langNames = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
    ko: 'Korean', zh: 'Chinese', ar: 'Arabic', hi: 'Hindi',
    th: 'Thai', vi: 'Vietnamese', tr: 'Turkish', my: 'Burmese',
  };
  const langName = langNames[languageCode] || languageCode.toUpperCase();

  await bot.sendMessage(chatId,
    `✅ Language set to *${langName}*`,
    { parse_mode: 'Markdown' }
  );

  return languageCode;
}

module.exports = {
  promptLanguage,
  processLanguageInput,
};
