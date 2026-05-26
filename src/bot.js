/**
 * 🔮 Mystic Tarot Reader — Telegram Bot
 * Entry Point & Command Router
 *
 * Orchestrates all handlers, manages conversation state,
 * and routes messages/callbacks to the correct handlers.
 */

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

// Handlers
const { handleStart } = require('./handlers/startHandler');
const { handleYesNo, promptQuestion, processYesNoQuestion } = require('./handlers/yesNoHandler');
const {
  handlePremiumReading, sendReaderTextMenu, handleReaderSelection, handleReaderConfirmation, promptPremiumQuestion,
  handleQuestionReceived, handleStopShuffle, executeReading, handleReveal,
} = require('./handlers/premiumHandler');
const { handleFollowUpRequest, processFollowUpQuestion } = require('./handlers/followUpHandler');
const { handlePreCheckout, handleSuccessfulPayment, handlePaymentCancel } = require('./handlers/paymentHandler');
const { processLanguageInput } = require('./handlers/languageHandler');
const { processNameInput, processDOBInput, needsOnboarding, startOnboarding } = require('./handlers/onboardingHandler');
const { handleReferral } = require('./handlers/referralHandler');

// Services
const { cleanupTempFiles } = require('./services/imageService');

// Cron
const { startDailyReminder } = require('../cron/dailyReminder');

// Keyboard
const { mainMenuKeyboard } = require('./utils/keyboard');

// ─── INITIALIZE BOT ─────────────────────────────────────────

const url = process.env.RENDER_EXTERNAL_URL || process.env.RENDER_URL;
const port = process.env.PORT || 3000;

let bot;
if (url) {
  bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { webHook: { port: port, host: '0.0.0.0' } });
  bot.setWebHook(`${url}/bot${config.TELEGRAM_BOT_TOKEN}`);
  console.log(`🌐 Webhook mode enabled. Listening on port ${port} via ${url}`);
} else {
  bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('🔄 Polling mode enabled (local development)');
}
console.log('🔮 Mystic Tarot Reader Bot is starting...');

// ─── IN-MEMORY STATE MANAGEMENT ─────────────────────────────
// Tracks conversation flow per user (language prompts, question awaits, etc.)
const userState = {};

// ─── COMMAND HANDLERS ────────────────────────────────────────

bot.onText(/\/start(.*)/, (msg) => handleStart(bot, msg));

bot.onText(/\/referral/, (msg) => handleReferral(bot, msg));

bot.onText(/\/myid/, async (msg) => {
  const isAdmin = config.ADMIN_TELEGRAM_IDS.includes(msg.from.id);
  await bot.sendMessage(msg.chat.id,
    `🆔 *Your Telegram ID:* \`${msg.from.id}\`\n${isAdmin ? '🔓 _Admin privileges active_' : ''}`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(msg.chat.id,
    '🔮 *Mystic Tarot Reader — Help*\n\n' +
    '*Commands:*\n' +
    '/start — Main menu\n' +
    '/referral — Your referral link & rewards\n' +
    '/help — This help message\n\n' +
    '*Readings Available:*\n' +
    '🃏 *Daily Free Card* — One free card per day\n' +
    '✨ *Quick Yes/No* — A swift definitive answer\n' +
    '⏳ *Past, Present, Future* — 3-card timeline (⭐ Stars)\n' +
    '❤️ *Love & Relationships* — 3-card love spread (⭐ Stars)\n' +
    '💼 *Career & Finance* — 3-card career spread (⭐ Stars)\n\n' +
    '*Features:*\n' +
    '🔄 Reversed cards (30% chance) for dynamic readings\n' +
    '⚡ Jumper cards (10% chance) for hidden messages\n' +
    '🔮 Follow-up questions with cross-analysis\n' +
    '📤 Referral rewards for inviting friends\n\n' +
    '_All readings are for entertainment and self-reflection purposes._',
    { parse_mode: 'Markdown' }
  );
});

// ─── MENU BUTTON TEXT HANDLERS ───────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const text = msg.text.trim();

  // ─── Handle menu button presses ───────────────
  if (text === '🃏 Draw Daily Free Card') {
    return handlePremiumReading(bot, msg, userState, 'daily');
  }
  if (text === '✨ Quick Yes/No') {
    return handleYesNo(bot, msg, userState);
  }
  if (text === '⏳ Past, Present, Future') {
    return handlePremiumReading(bot, msg, userState, 'ppf');
  }
  if (text === '❤️ Love & Relationships') {
    return handlePremiumReading(bot, msg, userState, 'love');
  }
  if (text === '💼 Career & Finance') {
    return handlePremiumReading(bot, msg, userState, 'career');
  }

  // ─── Handle conversation state ─────────────────
  const state = userState[telegramId];
  if (!state) return;

  // Language input
  if (state.awaitingLanguage) {
    const langCode = await processLanguageInput(bot, msg, userState);
    if (!langCode) return;

    if (state.currentFlow === 'yes_no') {
      return promptQuestion(bot, chatId, userState, telegramId);
    }
    if (['daily', 'ppf', 'love', 'career'].includes(state.currentFlow)) {
      // Check onboarding
      const onboard = await needsOnboarding(telegramId);
      if (onboard) {
        return startOnboarding(bot, chatId, userState, telegramId);
      }
      return promptPremiumQuestion(bot, chatId, userState, telegramId);
    }
    return;
  }

  // Name input (onboarding)
  if (state.awaitingName) {
    const success = await processNameInput(bot, msg, userState);
    if (success) return; // processNameInput will prompt for DOB
    return;
  }

  // DOB input (onboarding)
  if (state.awaitingDOB) {
    const success = await processDOBInput(bot, msg, userState);
    if (!success) return; // Invalid input, retry

    // Continue to question prompt after onboarding
    if (['daily', 'ppf', 'love', 'career'].includes(state.currentFlow)) {
      return promptPremiumQuestion(bot, chatId, userState, telegramId);
    }
    return;
  }

  // Question input (Yes/No)
  if (state.awaitingQuestion && state.currentFlow === 'yes_no') {
    state.awaitingQuestion = false;
    return processYesNoQuestion(bot, chatId, telegramId, text, userState);
  }

  // Question input (Premium)
  if (state.awaitingQuestion && ['ppf', 'love', 'career'].includes(state.currentFlow)) {
    return handleQuestionReceived(bot, chatId, telegramId, text, userState);
  }

  // Follow-up question input
  if (state.awaitingFollowUpQuestion) {
    state.awaitingFollowUpQuestion = false;
    return processFollowUpQuestion(bot, chatId, telegramId, text, userState);
  }
});

// ─── CALLBACK QUERY HANDLER ─────────────────────────────────

bot.on('callback_query', async (query) => {
  const data = query.data;

  try {
    // Reader selection
    if (data.startsWith('select_reader:')) {
      return handleReaderSelection(bot, query, userState);
    }

    // Reader confirmation
    if (data.startsWith('confirm_reader:')) {
      return handleReaderConfirmation(bot, query, userState);
    }

    // Reselect reader
    if (data === 'reselect_reader') {
      await bot.answerCallbackQuery(query.id);
      const telegramId = query.from.id;
      return sendReaderTextMenu(bot, query.message.chat.id, telegramId, userState, query.message.message_id);
    }

    // Stop shuffle
    if (data === 'stop_shuffle') {
      return handleStopShuffle(bot, query, userState);
    }

    // Reveal reading
    if (data.startsWith('reveal:')) {
      return handleReveal(bot, query, userState);
    }

    // Follow-up request
    if (data.startsWith('followup:')) {
      return handleFollowUpRequest(bot, query, userState);
    }

    // Payment cancel
    if (data === 'cancel_payment') {
      return handlePaymentCancel(bot, query, userState);
    }

    // Menu selections from inline keyboard
    if (data.startsWith('menu:')) {
      await bot.answerCallbackQuery(query.id);
      const action = data.split(':')[1];
      
      // Simulate message object for handlers that expect it
      const fakeMsg = {
        chat: query.message.chat,
        from: query.from,
        text: ''
      };

      if (action === 'daily') return handlePremiumReading(bot, fakeMsg, userState, 'daily');
      if (action === 'yes_no') return handleYesNo(bot, fakeMsg, userState);
      if (action === 'ppf') return handlePremiumReading(bot, fakeMsg, userState, 'ppf');
      if (action === 'love') return handlePremiumReading(bot, fakeMsg, userState, 'love');
      if (action === 'career') return handlePremiumReading(bot, fakeMsg, userState, 'career');
    }

    // Back to menu
    if (data === 'back_to_menu') {
      await bot.answerCallbackQuery(query.id);
      const chatId = query.message.chat.id;
      
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
        '🔮 *Main Menu*\n\n' +
        'Choose your path below:\n\n' +
        '🃏 *Daily Free Card*\n_Your daily guidance from the universe_\n\n' +
        '✨ *Quick Yes/No*\n_A swift answer to your burning question_\n\n' +
        '⏳ *Past, Present, Future*\n_Understand your timeline_\n\n' +
        '❤️ *Love & Relationships*\n_Matters of the heart_\n\n' +
        '💼 *Career & Finance*\n_Professional guidance_\n\n' +
        '👇 _Tap a button below to begin your journey..._',
        {
          parse_mode: 'Markdown',
          reply_markup: inlineMenu,
        }
      );
      // Clean up state
      const telegramId = query.from.id;
      if (userState[telegramId]) {
        userState[telegramId].currentFlow = null;
      }
      return;
    }
  } catch (error) {
    console.error('Callback query error:', error);
    await bot.answerCallbackQuery(query.id, { text: 'An error occurred. Please try again.' });
  }
});

// ─── PAYMENT HANDLERS ───────────────────────────────────────

bot.on('pre_checkout_query', (query) => handlePreCheckout(bot, query));

bot.on('message', async (msg) => {
  if (msg.successful_payment) {
    return handleSuccessfulPayment(bot, msg, userState);
  }
});

// ─── INCOMPLETE SESSION RESUME ──────────────────────────────

bot.on('resume_incomplete_session', async (msg, session) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  if (!userState[telegramId]) userState[telegramId] = {};

  if (session.reading_type === 'yes_no') {
    const { executeYesNoReading } = require('./handlers/yesNoHandler');
    await executeYesNoReading(bot, chatId, telegramId, null, null, userState, session.id);
  } else {
    await executeReading(bot, chatId, telegramId, userState, session.id);
  }
});

// ─── STARTUP TASKS ──────────────────────────────────────────

// Start daily reminder cron
startDailyReminder(bot);

// Periodic temp file cleanup (every 6 hours)
setInterval(() => {
  cleanupTempFiles();
}, 6 * 60 * 60 * 1000);

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code, error.message);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

console.log('🔮 Mystic Tarot Reader Bot is live and listening!');

// End of bot.js
