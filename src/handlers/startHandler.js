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
      '⚡ *Welcome back!*\n\n' +
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

  let referralLine = '';
  if (user && user.referral_code) {
    const referralLink = generateReferralLink(config.BOT_USERNAME, user.referral_code);
    referralLine = `\n📤 _Share & earn! Your referral link:_ \`${referralLink}\``;
  }

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
    `${welcomeText}\n\n` +
    '✨ I am your gateway to ancient wisdom and cosmic insight.\n\n' +
    'Choose your path below:\n\n' +
    '🃏 *Daily Free Card*\n_Your daily guidance from the universe_\n\n' +
    '✨ *Quick Yes/No*\n_A swift answer to your burning question_\n\n' +
    '⏳ *Past, Present, Future*\n_Understand your timeline_\n\n' +
    '❤️ *Love & Relationships*\n_Matters of the heart_\n\n' +
    '💼 *Career & Finance*\n_Professional guidance_\n\n' +
    '👇 _Tap a button below to begin your journey..._' +
    referralLine,
    {
      parse_mode: 'Markdown',
      reply_markup: inlineMenu,
    }
  );
}

module.exports = { handleStart };
