/**
 * Daily Free Card Handler
 * One free card per day with Gemini interpretation
 */

const db = require('../services/supabaseService');
const { drawCards, serializeCards } = require('../services/cardService');
const { getCardImagePath } = require('../services/imageService');
const { generateReading } = require('../services/geminiService');
const { buildDailyCardPrompt } = require('../prompts/systemPrompts');
const { sendTypingAction, formatCardDisplay } = require('../utils/helpers');
const { backToMenuKeyboard } = require('../utils/keyboard');
const { promptLanguage, processLanguageInput } = require('./languageHandler');
const fs = require('fs');

async function handleDailyCard(bot, msg, userState) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  // Check if already used today
  const alreadyUsed = await db.hasDailyCardBeenUsed(telegramId);
  if (alreadyUsed) {
    await bot.sendMessage(chatId,
      '🌅 *You\'ve already drawn your free daily card today!*\n\n' +
      'Come back tomorrow for fresh cosmic guidance. ✨\n\n' +
      '_Or try a premium reading for deeper insight._',
      { parse_mode: 'Markdown', reply_markup: backToMenuKeyboard() }
    );
    return;
  }

  // Initialize state
  if (!userState[telegramId]) userState[telegramId] = {};
  userState[telegramId].currentFlow = 'daily';

  // Check/prompt for language
  const user = await db.getUser(telegramId);
  const language = user?.language;

  if (!language) {
    const result = await promptLanguage(bot, chatId, userState, telegramId);
    if (!result) return; // Waiting for language input
  }

  await executeDailyDraw(bot, chatId, telegramId, userState);
}

async function executeDailyDraw(bot, chatId, telegramId, userState) {
  const user = await db.getUser(telegramId);
  const language = userState[telegramId]?.language || user?.language || 'en';

  // Show typing indicator
  const typingInterval = await sendTypingAction(bot, chatId, 15000);

  try {
    // Draw 1 card
    const { cards } = drawCards(1, 'daily');
    const drawnCard = cards[0];

    // Send card image
    const imagePath = await getCardImagePath(drawnCard.card.filename, drawnCard.is_reversed);
    if (imagePath && fs.existsSync(imagePath)) {
      const caption = `🃏 *Your Daily Card*\n\n${formatCardDisplay(drawnCard.card, drawnCard.is_reversed)}`;
      await bot.sendPhoto(chatId, imagePath, {
        caption,
        parse_mode: 'Markdown',
        protect_content: false,
      });
    }

    // Generate reading via Gemini
    const promptData = buildDailyCardPrompt(drawnCard.card, drawnCard.is_reversed, language);
    const reading = await generateReading(promptData);

    // Send reading
    await bot.sendMessage(chatId, reading, {
      parse_mode: 'Markdown',
      reply_markup: backToMenuKeyboard(),
      protect_content: false,
    });

    // Save to DB
    await db.setDailyCardUsed(telegramId);
    await db.createSession({
      telegram_id: telegramId,
      reading_type: 'daily',
      question: 'Daily guidance',
      cards: serializeCards(cards),
      gemini_response: reading,
      language,
      payment_status: 'free',
      is_complete: true,
    });

    // Clean up state
    delete userState[telegramId].currentFlow;
  } catch (error) {
    console.error('Daily card error:', error);
    await bot.sendMessage(chatId,
      '❌ An error occurred while drawing your card. Please try again.',
      { reply_markup: backToMenuKeyboard() }
    );
  } finally {
    clearInterval(typingInterval);
  }
}

module.exports = {
  handleDailyCard,
  executeDailyDraw,
};
