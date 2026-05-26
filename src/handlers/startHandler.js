/**
 * /start Command Handler
 * Main menu, referral deep-link parsing, welcome message
 */

const db = require('../services/supabaseService');
const { mainMenuKeyboard } = require('../utils/keyboard');
const { generateReferralLink } = require('../utils/helpers');
const config = require('../config');

async function handleStart(bot, msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const username = msg.from.username;
  const firstName = msg.from.first_name;

  // Get or create user
  const user = await db.getOrCreateUser(telegramId, username, firstName);

  // Check for referral deep link: /start ref_XXXXXX
  const startParam = msg.text?.split(' ')[1];
  if (startParam && startParam.startsWith('ref_')) {
    const referralCode = startParam.replace('ref_', '');
    if (user && !user.referred_by) {
      // Don't let users refer themselves
      const referrer = await db.getUserByReferralCode(referralCode);
      if (referrer && referrer.telegram_id !== telegramId) {
        await db.setReferredBy(telegramId, referralCode);
      }
    }
  }

  // Check for incomplete paid session (transaction fallback)
  const incompleteSession = await db.getIncompleteSession(telegramId);
  if (incompleteSession) {
    await bot.sendMessage(chatId,
      '⚡ *Welcome back!*

' +
      'I noticed you have an undelivered reading from a previous session. ' +
      'Let me process that for you right now...',
      { parse_mode: 'Markdown' }
    );
    // Emit event for the premium handler to pick up
    bot.emit('resume_incomplete_session', msg, incompleteSession);
    return;
  }

  // Welcome message
  const welcomeText = user?.display_name
    ? `🔮 *Welcome back, ${user.display_name}!*`
    : `🔮 *Welcome to FateNode — AI Tarot Reader!*`;

  // Create inline keyboard attached to the message
  const inlineMenu = {
    inline_keyboard: [
      [{ text: '🃏 Draw Daily Free Card', callback_data: 'menu:daily' }],
      [{ text: '✨ Quick Yes/No', callback_data: 'menu:yes_no' }],
      [{ text: '⏳ Past, Present, Future', callback_data: 'menu:ppf' }],
      [{ text: '❤️ Love & Relationships', callback_data: 'menu:love' }],
      [{ text: '💼 Career & Finance', callback_data: 'menu:career' }],
    ]
  };

  await bot.sendMessage(chatId,
    `${welcomeText}

` +
    '✨ I am your gateway to ancient wisdom and cosmic insight.

' +
    'Choose your path below:

' +
    '🃏 *Daily Free Card*
_Your daily guidance from the universe_

' +
    '✨ *Quick Yes/No*
_A swift answer to your burning question_

' +
    '⏳ *Past, Present, Future*
_Understand your timeline_

' +
    '❤️ *Love & Relationships*
_Matters of the heart_

' +
    '💼 *Career & Finance*\
_Professional guidance_\
\
' +
    '👇 _Tap a button below to begin your journey..._',
    {
      parse_mode: 'Markdown',
      reply_markup: inlineMenu,
    }
  );
}

module.exports = { handleStart };
