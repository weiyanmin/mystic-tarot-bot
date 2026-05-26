/**
 * Quick Yes/No Handler
 * Flow A: Language → Question → Draw 1 Card → Gemini Yes/No → Deliver
 */

const db = require('../services/supabaseService');
const config = require('../config');
const { drawCards, serializeCards } = require('../services/cardService');
const { getCardImagePath } = require('../services/imageService');
const { generateReading } = require('../services/geminiService');
const { buildYesNoPrompt } = require('../prompts/systemPrompts');
const { sendTypingAction, formatCardDisplay } = require('../utils/helpers');
const { followUpKeyboard } = require('../utils/keyboard');
const { promptLanguage } = require('./languageHandler');
const fs = require('fs');

async function handleYesNo(bot, msg, userState) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  // Initialize state
  if (!userState[telegramId]) userState[telegramId] = {};
  userState[telegramId].currentFlow = 'yes_no';

  // Check/prompt for language
  const user = await db.getUser(telegramId);

  if (!user?.language) {
    const result = await promptLanguage(bot, chatId, userState, telegramId);
    if (!result) return; // Waiting for language input
  } else {
    userState[telegramId].language = user.language;
  }

  // Prompt for question
  await promptQuestion(bot, chatId, userState, telegramId);
}

async function promptQuestion(bot, chatId, userState, telegramId) {
  userState[telegramId].awaitingQuestion = true;
  
  const alreadyUsed = await db.hasYesNoBeenUsed(telegramId);
  userState[telegramId].yesNoPaymentStatus = alreadyUsed ? 'pending' : 'free';

  const priceText = alreadyUsed 
    ? `\n\n_Note: You have used your free Yes/No reading today. This reading will cost ${config.PRICE_QUICK_READING || 50} ⭐️._`
    : '\n\n🎁 _This reading is free once per day._';

  await bot.sendMessage(chatId,
    '✨ *Quick Yes/No Reading*\n\n' +
    '🤔 *Type your Yes or No question:*\n\n' +
    '_Example: "Will I get the job I applied for?"_' +
    priceText,
    { parse_mode: 'Markdown' }
  );
}

async function processYesNoQuestion(bot, chatId, telegramId, question, userState) {
  const language = userState[telegramId]?.language || 'en';
  const paymentStatus = userState[telegramId]?.yesNoPaymentStatus || 'free';
  const isAdmin = config.ADMIN_TELEGRAM_IDS.includes(telegramId);

  // If free or admin, just execute immediately
  if (paymentStatus === 'free' || isAdmin) {
    if (isAdmin && paymentStatus === 'pending') {
      await bot.sendMessage(chatId, '🔓 *Admin Mode — Payment Bypassed*', { parse_mode: 'Markdown' });
    }
    userState[telegramId].awaitingQuestion = false;
    await executeYesNoReading(bot, chatId, telegramId, question, language, userState, null);
    return;
  }

  // Otherwise, it's paid. Create pending session and send invoice.
  try {
    const { cards, hasJumper } = drawCards(1, 'yes_no');
    
    const session = await db.createSession({
      telegram_id: telegramId,
      reading_type: 'yes_no',
      question,
      cards: serializeCards(cards),
      language,
      payment_status: 'pending',
      is_complete: false,
    });

    userState[telegramId].pendingSessionId = session.id;
    userState[telegramId].awaitingQuestion = false;
    userState[telegramId].currentFlow = null;

    const price = config.PRICE_QUICK_READING || 50;

    await db.createPayment({
      telegram_id: telegramId,
      session_id: session.id,
      stars_amount: price,
      status: 'pending',
    });

    await bot.sendInvoice(
      chatId,
      'Quick Yes/No Reading',
      `✨ Quick Yes/No Reading\n🔮 Get a swift, definitive answer from the cards`,
      `yesno_${session.id}`,
      '',
      'XTR',
      [{ label: 'Quick Yes/No', amount: price }]
    );
  } catch (error) {
    console.error('Yes/No invoice error:', error);
    await bot.sendMessage(chatId, '❌ An error occurred while setting up payment. Please try again.');
  }
}

async function executeYesNoReading(bot, chatId, telegramId, question, language, userState, sessionId) {
  const typingInterval = await sendTypingAction(bot, chatId, 20000);

  try {
    let cards, drawnCard, hasJumper, session;

    if (sessionId) {
      // Resume from payment
      session = await db.getSessionById(sessionId);
      if (!session) throw new Error('Session not found');
      cards = require('../services/cardService').deserializeCards(session.cards);
      drawnCard = cards.find((c) => !c.is_jumper) || cards[0];
      hasJumper = cards.some(c => c.is_jumper);
      question = session.question;
      language = session.language || 'en';
    } else {
      // Free or admin bypass
      const drawResult = drawCards(1, 'yes_no');
      cards = drawResult.cards;
      hasJumper = drawResult.hasJumper;
      drawnCard = cards.find((c) => !c.is_jumper) || cards[0];
    }

    // Send card image(s)
    for (const card of cards) {
      const imagePath = await getCardImagePath(card.card.filename, card.is_reversed);
      if (imagePath && fs.existsSync(imagePath)) {
        const jumperNote = card.is_jumper ? '⚡ _A card flew from the deck!_\n' : '';
        const caption = `${jumperNote}${formatCardDisplay(card.card, card.is_reversed)}`;
        await bot.sendPhoto(chatId, imagePath, {
          caption,
          parse_mode: 'Markdown',
          protect_content: false,
        });
      }
    }

    if (hasJumper) {
      await bot.sendMessage(chatId,
        '⚡ *A Jumper Card!*\nA card flew from the deck unbidden — this carries a hidden message that overarches your question.',
        { parse_mode: 'Markdown' }
      );
    }

    // Generate reading via Gemini
    const mainCard = drawnCard;
    const promptData = buildYesNoPrompt(mainCard.card, mainCard.is_reversed, question, language);
    const reading = await generateReading(promptData);

    let finalSessionId = sessionId;

    if (sessionId) {
      // Update existing session
      await db.updateSession(sessionId, {
        gemini_response: reading,
        is_complete: true,
      });
    } else {
      // Save new session for free/admin
      const newSession = await db.createSession({
        telegram_id: telegramId,
        reading_type: 'yes_no',
        question,
        cards: serializeCards(cards),
        gemini_response: reading,
        language,
        payment_status: config.ADMIN_TELEGRAM_IDS.includes(telegramId) && userState[telegramId]?.yesNoPaymentStatus === 'pending' ? 'paid' : 'free',
        is_complete: true,
      });
      finalSessionId = newSession?.id;
    }

    // Send reading
    await bot.sendMessage(chatId, reading, {
      parse_mode: 'Markdown',
      reply_markup: followUpKeyboard(finalSessionId || 'none'),
      protect_content: false,
    });

    // Clean up state
    if (userState[telegramId]) {
      userState[telegramId].currentFlow = null;
      userState[telegramId].lastSessionId = finalSessionId;
    }
  } catch (error) {
    console.error('Yes/No reading error:', error);
    await bot.sendMessage(chatId,
      '❌ An error occurred while generating your reading. Please try again.'
    );
  } finally {
    clearInterval(typingInterval);
  }
}

module.exports = {
  handleYesNo,
  promptQuestion,
  processYesNoQuestion,
  executeYesNoReading,
};
