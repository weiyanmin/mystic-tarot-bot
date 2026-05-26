/**
 * Follow-Up Question Handler
 * Cross-analysis of new cards with initial reading context
 */

const db = require('../services/supabaseService');
const { drawFollowUpCards, serializeCards, deserializeCards } = require('../services/cardService');
const { getCardImagePath } = require('../services/imageService');
const { generateFollowUpReading } = require('../services/geminiService');
const { buildFollowUpPrompt } = require('../prompts/systemPrompts');
const { sendTypingAction, formatCardDisplay, delay } = require('../utils/helpers');
const { followUpKeyboard, backToMenuKeyboard } = require('../utils/keyboard');
const config = require('../config');
const fs = require('fs');

async function handleFollowUpRequest(bot, callbackQuery, userState) {
  const chatId = callbackQuery.message.chat.id;
  const telegramId = callbackQuery.from.id;
  const sessionId = callbackQuery.data.replace('followup:', '');

  await bot.answerCallbackQuery(callbackQuery.id, { text: '🔮 Follow-up mode activated!' });

  if (!userState[telegramId]) userState[telegramId] = {};
  userState[telegramId].currentFlow = 'followup';
  userState[telegramId].followUpSessionId = sessionId;
  userState[telegramId].awaitingFollowUpQuestion = true;

  await bot.sendMessage(chatId,
    '🔮 *Follow-Up Reading*\n\n' +
    '💭 *What else would you like to explore?*\n\n' +
    '_The new cards will be cross-analyzed with your initial draw to deepen the insight._\n\n' +
    'Type your follow-up question:',
    { parse_mode: 'Markdown' }
  );
}

async function processFollowUpQuestion(bot, chatId, telegramId, followUpQuestion, userState) {
  const sessionId = userState[telegramId]?.followUpSessionId;
  if (!sessionId) {
    await bot.sendMessage(chatId, '❌ No active reading session found. Please start a new reading.');
    return;
  }

  // Save the question for after payment
  userState[telegramId].pendingFollowUpQuestion = followUpQuestion;
  
  // Check if admin bypass
  const isAdmin = config.ADMIN_TELEGRAM_IDS.includes(telegramId);
  if (isAdmin) {
    console.log(`🔓 Admin bypass for follow-up (user ${telegramId})`);
    await bot.sendMessage(chatId,
      '🔓 *Admin Mode — Payment Bypassed*\n\n🔮 _Consulting the cards for your follow-up..._',
      { parse_mode: 'Markdown' }
    );
    await executeFollowUpReading(bot, chatId, telegramId, userState, sessionId, followUpQuestion);
    return;
  }

  // Normal user: send invoice
  const price = config.PRICE_FOLLOW_UP || 30;
  try {
    // Create payment record in DB (optional, but good for tracking)
    await db.createPayment({
      telegram_id: telegramId,
      session_id: sessionId,
      stars_amount: price,
      status: 'pending',
    });

    await bot.sendInvoice(
      chatId,
      'Follow-Up Reading',
      `✨ Follow-Up Reading\n🔮 Deepen your insight with additional cards and cross-analysis`,
      `followup_${sessionId}`,          // payload (note the prefix)
      '',                               // provider_token (empty for Stars)
      'XTR',                            // currency (Telegram Stars)
      [{ label: 'Follow-Up Reading', amount: price }]
    );
  } catch (error) {
    console.error('Follow-up invoice error:', error);
    await bot.sendMessage(chatId, '❌ An error occurred while setting up payment. Please try again.');
  }
}

async function executeFollowUpReading(bot, chatId, telegramId, userState, sessionId, followUpQuestion) {
  const typingInterval = await sendTypingAction(bot, chatId, 25000);

  try {
    // Fetch the original session
    const session = await db.getSessionById(sessionId);
    if (!session) {
      throw new Error('Original session not found');
    }

    const initialCards = deserializeCards(session.cards);
    const initialQuestion = session.question;
    const language = session.language || 'en';
    const reader = config.READERS.find((r) => r.id === session.reader_persona);

    // Draw new follow-up cards (1-3)
    const { cards: newCards, hasJumper } = drawFollowUpCards();

    // Send new card images
    await bot.sendMessage(chatId,
      '🔮 *New cards emerge to deepen your insight...*',
      { parse_mode: 'Markdown' }
    );

    for (const card of newCards) {
      const imagePath = await getCardImagePath(card.card.filename, card.is_reversed);
      if (imagePath && fs.existsSync(imagePath)) {
        const jumperNote = card.is_jumper ? '⚡ _A card flew from the deck!_\n' : '';
        const caption = `${jumperNote}${formatCardDisplay(card.card, card.is_reversed)}`;
        await bot.sendPhoto(chatId, imagePath, {
          caption,
          parse_mode: 'Markdown',
          protect_content: false,
        });
        await delay(500);
      }
    }

    if (hasJumper) {
      await bot.sendMessage(chatId,
        '⚡ *A Jumper Card appeared again!*\nThe universe has an urgent message woven through this follow-up.',
        { parse_mode: 'Markdown' }
      );
    }

    // Build cross-analysis prompt
    const promptData = buildFollowUpPrompt(
      initialQuestion,
      initialCards,
      followUpQuestion,
      newCards,
      reader,
      language
    );

    // Build conversation context from previous readings
    const previousContext = [
      { role: 'user', text: `Initial question: ${initialQuestion}` },
      { role: 'model', text: session.gemini_response || 'Previous reading delivered.' },
    ];

    // Add any prior follow-ups as context
    const existingFollowUps = session.follow_ups || [];
    for (const fu of existingFollowUps) {
      previousContext.push({ role: 'user', text: `Follow-up: ${fu.question}` });
      previousContext.push({ role: 'model', text: fu.response || '' });
    }

    // Generate follow-up reading
    const reading = await generateFollowUpReading(promptData, previousContext);

    // Send reading
    await bot.sendMessage(chatId, reading, {
      parse_mode: 'Markdown',
      reply_markup: followUpKeyboard(sessionId),
      protect_content: false,
    });

    // Update session with follow-up data
    const followUpEntry = {
      question: followUpQuestion,
      cards: serializeCards(newCards),
      response: reading,
      timestamp: new Date().toISOString(),
    };

    const updatedFollowUps = [...existingFollowUps, followUpEntry];
    await db.updateSession(sessionId, {
      follow_ups: updatedFollowUps,
    });

    // Clean up state
    userState[telegramId].awaitingFollowUpQuestion = false;
    userState[telegramId].currentFlow = null;
    userState[telegramId].pendingFollowUpQuestion = null;
  } catch (error) {
    console.error('Follow-up reading error:', error);
    await bot.sendMessage(chatId,
      '❌ An error occurred during the follow-up reading. Please try again.',
      { reply_markup: backToMenuKeyboard() }
    );
  } finally {
    clearInterval(typingInterval);
  }
}

module.exports = {
  handleFollowUpRequest,
  processFollowUpQuestion,
  executeFollowUpReading,
};
