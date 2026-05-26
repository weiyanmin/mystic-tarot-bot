/**
 * First-Time User Onboarding Handler
 * Collects name and Date of Birth, saves to Supabase
 */

const db = require('../services/supabaseService');

/**
 * Check if the user needs onboarding
 * @param {number} telegramId
 * @returns {Promise<boolean>}
 */
async function needsOnboarding(telegramId) {
  const user = await db.getUser(telegramId);
  return user && !user.is_onboarded;
}

/**
 * Start the onboarding flow — prompt for name
 * @param {Object} bot
 * @param {number} chatId
 * @param {Object} userState
 * @param {number} telegramId
 */
async function startOnboarding(bot, chatId, userState, telegramId) {
  userState[telegramId] = {
    ...userState[telegramId],
    awaitingName: true,
  };

  await bot.sendMessage(chatId,
    '✨ *Let\'s personalize your experience!*\n\n' +
    'This is a one-time setup to make your readings more personal.\n\n' +
    '📝 *What name would you like me to call you?*',
    { parse_mode: 'Markdown' }
  );
}

/**
 * Process the user's name input
 * @param {Object} bot
 * @param {Object} msg
 * @param {Object} userState
 */
async function processNameInput(bot, msg, userState) {
  const telegramId = msg.from.id;
  const chatId = msg.chat.id;
  const name = msg.text?.trim();

  if (!name || name.length > 50) {
    await bot.sendMessage(chatId, '⚠️ Please enter a valid name (max 50 characters).');
    return false;
  }

  userState[telegramId].displayName = name;
  userState[telegramId].awaitingName = false;
  userState[telegramId].awaitingDOB = true;

  await bot.sendMessage(chatId,
    `✨ Lovely to meet you, *${name}*!\n\n` +
    '🎂 *What is your Date of Birth?*\n' +
    '_This helps personalize astrological aspects of your readings._\n\n' +
    'Format: `DD/MM/YYYY` (e.g., `15/03/1990`)\n\n' +
    '_Type "skip" to skip this step._',
    { parse_mode: 'Markdown' }
  );
  return true;
}

/**
 * Process the user's DOB input
 * @param {Object} bot
 * @param {Object} msg
 * @param {Object} userState
 */
async function processDOBInput(bot, msg, userState) {
  const telegramId = msg.from.id;
  const chatId = msg.chat.id;
  const input = msg.text?.trim();

  let dob = null;

  if (input.toLowerCase() !== 'skip') {
    // Validate date format
    const dateRegex = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/;
    const match = input.match(dateRegex);

    if (!match) {
      await bot.sendMessage(chatId,
        '⚠️ Invalid date format. Please use `DD/MM/YYYY` or type "skip".',
        { parse_mode: 'Markdown' }
      );
      return false;
    }

    const [, day, month, year] = match;
    const date = new Date(year, month - 1, day);

    if (isNaN(date.getTime()) || date > new Date()) {
      await bot.sendMessage(chatId, '⚠️ That doesn\'t seem like a valid date. Please try again or type "skip".');
      return false;
    }

    dob = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  // Save to DB
  const displayName = userState[telegramId].displayName;
  await db.updateUserProfile(telegramId, displayName, dob);

  userState[telegramId].awaitingDOB = false;

  await bot.sendMessage(chatId,
    '🌟 *Profile saved!*\n\n' +
    `Name: *${displayName}*\n` +
    `Date of Birth: *${dob || 'Not provided'}*\n\n` +
    '_Your readings will now be personalized to you._\n\n' +
    'Now, let\'s continue with your reading... ✨',
    { parse_mode: 'Markdown' }
  );

  return true;
}

module.exports = {
  needsOnboarding,
  startOnboarding,
  processNameInput,
  processDOBInput,
};
