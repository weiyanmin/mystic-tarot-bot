/**
 * Premium Reading Handler
 * Flow B: Reader Select → Language → Onboarding → Question → Shuffle → Payment → Draw → Deliver
 */

const db = require('../services/supabaseService');
const { drawCards, serializeCards, deserializeCards } = require('../services/cardService');
const { getCardImagePath, getShuffleGifPath } = require('../services/imageService');
const { generateReading } = require('../services/geminiService');
const { buildReadingPrompt } = require('../prompts/systemPrompts');
const { sendTypingAction, formatCardDisplay, delay, sendSplitMessage } = require('../utils/helpers');
const { 
  readerSelectionKeyboard, stopShuffleKeyboard, 
  followUpKeyboard, revealReadingKeyboard 
} = require('../utils/keyboard');
const { promptLanguage } = require('./languageHandler');
const { needsOnboarding, startOnboarding } = require('./onboardingHandler');
const config = require('../config');
const fs = require('fs');

async function handlePremiumReading(bot, msg, userState, readingType) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  if (readingType === 'daily') {
    const alreadyUsed = await db.hasDailyCardBeenUsed(telegramId);
    if (alreadyUsed) {
      const { backToMenuKeyboard } = require('../utils/keyboard');
      await bot.sendMessage(chatId,
        '🌅 *You\'ve already drawn your free daily card today!*\n\n' +
        'Come back tomorrow for fresh cosmic guidance. ✨\n\n' +
        '_Or try a premium reading for deeper insight._',
        { parse_mode: 'Markdown', reply_markup: backToMenuKeyboard() }
      );
      return;
    }
  }

  // Initialize state
  if (!userState[telegramId]) userState[telegramId] = {};
  userState[telegramId].currentFlow = readingType;
  userState[telegramId].readingType = readingType;
  userState[telegramId].readerIndex = 0; // Start at the first reader

  await bot.sendMessage(chatId,
    '🔮 *Choose Your Reader*\n\n' +
    'Each reader brings a unique energy and perspective to your reading.',
    { parse_mode: 'Markdown' }
  );

  // Send the first reader in the carousel
  await sendReaderCarousel(bot, chatId, telegramId, userState);
}

async function sendReaderCarousel(bot, chatId, telegramId, userState, messageIdToEdit = null) {
  const index = userState[telegramId].readerIndex || 0;
  const reader = config.READERS[index];
  
  const caption = `*${reader.name}*\n\n_${reader.description}_\n\n*Vibe:* ${reader.style}`;

  // Keyboard layout:
  // [⬅️ Previous] [Confirm] [Next ➡️]
  const keyboard = {
    inline_keyboard: [
      [
        { text: '⬅️ Prev', callback_data: 'reader_nav:prev' },
        { text: '✅ Confirm', callback_data: `select_reader:${reader.id}` },
        { text: 'Next ➡️', callback_data: 'reader_nav:next' },
      ]
    ]
  };

  if (messageIdToEdit) {
    try {
      await bot.editMessageMedia({
        type: 'photo',
        media: fs.createReadStream(reader.image),
        caption: caption,
        parse_mode: 'Markdown'
      }, {
        chat_id: chatId,
        message_id: messageIdToEdit,
        reply_markup: keyboard
      });
      return;
    } catch (e) {
      // Fallback if local file attach fails on this specific telegram API wrapper version
      await bot.deleteMessage(chatId, messageIdToEdit).catch(() => {});
    }
  }
  
  // Send new message
  await bot.sendPhoto(chatId, fs.createReadStream(reader.image), {
    caption,
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

async function handleReaderSelection(bot, callbackQuery, userState) {
  const chatId = callbackQuery.message.chat.id;
  const telegramId = callbackQuery.from.id;
  const readerId = callbackQuery.data.replace('select_reader:', '');

  const reader = config.READERS.find((r) => r.id === readerId);
  if (!reader) return;

  // Save temporary reader selection
  if (!userState[telegramId]) userState[telegramId] = {};
  userState[telegramId].tempReader = reader;

  await bot.answerCallbackQuery(callbackQuery.id);
  
  // Update the carousel photo with the confirmation keyboard
  const caption = `You have selected *${reader.name}*.\n\n_${reader.description}_\n\nAre you sure you want to proceed with this reader?`;
  
  const confirmKeyboard = {
    inline_keyboard: [
      [{ text: '✅ Proceed with ' + reader.name, callback_data: `confirm_reader:${reader.id}` }],
      [{ text: '🔄 Choose Again', callback_data: 'reselect_reader' }]
    ]
  };

  try {
    await bot.editMessageCaption(caption, {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
      parse_mode: 'Markdown',
      reply_markup: confirmKeyboard,
    });
  } catch (e) {
    console.error('Failed to edit caption', e);
  }
}

async function handleReaderConfirmation(bot, callbackQuery, userState) {
  const chatId = callbackQuery.message.chat.id;
  const telegramId = callbackQuery.from.id;
  const readerId = callbackQuery.data.replace('confirm_reader:', '');

  const reader = config.READERS.find((r) => r.id === readerId);
  if (!reader) return;

  // Finalize selection
  userState[telegramId].selectedReader = reader;
  userState[telegramId].tempReader = null;

  await bot.answerCallbackQuery(callbackQuery.id, { text: `${reader.name} confirmed!` });
  
  // Delete the confirmation photo
  await bot.deleteMessage(chatId, callbackQuery.message.message_id).catch(() => {});
  
  // Send simple text confirmation
  await bot.sendMessage(chatId,
    `✅ *${reader.name}* will guide your reading.\n_${reader.description}_`,
    { parse_mode: 'Markdown' }
  );

  // Step 2: Language
  const user = await db.getUser(telegramId);
  if (!user?.language) {
    await promptLanguage(bot, chatId, userState, telegramId);
    return;
  }
  userState[telegramId].language = user.language;

  // Step 3: Onboarding (first-time only)
  const onboard = await needsOnboarding(telegramId);
  if (onboard) {
    await startOnboarding(bot, chatId, userState, telegramId);
    return;
  }

  // Step 4: Prompt question
  await promptPremiumQuestion(bot, chatId, userState, telegramId);
}

async function promptPremiumQuestion(bot, chatId, userState, telegramId) {
  const readingType = userState[telegramId]?.readingType;
  const typeLabels = {
    daily: '🌅 Daily Free Reading',
    ppf: '⏳ Past, Present & Future',
    love: '❤️ Love & Relationships',
    career: '💼 Career & Finance',
  };

  userState[telegramId].awaitingQuestion = true;

  if (readingType === 'daily') {
    await bot.sendMessage(chatId,
      `${typeLabels[readingType]}\n\n` +
      '💭 *What do you seek guidance on today?*\n\n' +
      '_Type a specific focus below, or just type "Daily" for general cosmic guidance for the day ahead._',
      { parse_mode: 'Markdown' }
    );
  } else {
    await bot.sendMessage(chatId,
      `${typeLabels[readingType] || '🔮 Tarot Reading'}\n\n` +
      '💭 *What question weighs on your mind?*\n\n' +
      '_Type your question below. The more specific, the more insightful the reading._\n\n' +
      'Example: _"What energy surrounds my current relationship with Alex?"_',
      { parse_mode: 'Markdown' }
    );
  }
}

async function handleQuestionReceived(bot, chatId, telegramId, question, userState) {
  userState[telegramId].question = question;
  userState[telegramId].awaitingQuestion = false;

  // Step 5: Shuffle animation + Stop button
  const shuffleGif = getShuffleGifPath();
  
  if (fs.existsSync(shuffleGif)) {
    const sentMsg = await bot.sendAnimation(chatId, shuffleGif, {
      caption: '🔀 *The cards are being shuffled...*\n\n_Focus on your question and tap when you feel ready._',
      parse_mode: 'Markdown',
      reply_markup: stopShuffleKeyboard(),
    });
    userState[telegramId].shuffleMessageId = sentMsg.message_id;
  } else {
    const sentMsg = await bot.sendMessage(chatId,
      '🔀 *The cards are being shuffled...*\n\n' +
      '✨ _The deck responds to your energy. Focus on your question..._\n\n' +
      '_Tap below when you feel ready to draw._',
      {
        parse_mode: 'Markdown',
        reply_markup: stopShuffleKeyboard(),
      }
    );
    userState[telegramId].shuffleMessageId = sentMsg.message_id;
  }

  userState[telegramId].awaitingStopShuffle = true;
}

async function handleStopShuffle(bot, callbackQuery, userState) {
  const chatId = callbackQuery.message.chat.id;
  const telegramId = callbackQuery.from.id;

  if (!userState[telegramId]?.awaitingStopShuffle) return;

  userState[telegramId].awaitingStopShuffle = false;
  await bot.answerCallbackQuery(callbackQuery.id, { text: '✨ Cards drawn!' });

  // Check if this user is an admin (bypass payment)
  const isAdmin = config.ADMIN_TELEGRAM_IDS.includes(telegramId);

  // Edit the shuffle message
  const statusText = isAdmin
    ? '🃏 *Cards have been drawn!*\n\n_Admin mode — skipping payment..._'
    : '🃏 *Cards have been drawn!*\n\n_Processing your payment..._';

  try {
    await bot.editMessageCaption(statusText, {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [] },
    });
  } catch {
    try {
      await bot.editMessageText(statusText, {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [] },
      });
    } catch (e) {
      // Ignore edit errors
    }
  }

  // Step 6: Draw cards and handle payment
  const readingType = userState[telegramId]?.readingType;
  const price = config.PRICE_QUICK_READING; // Stars amount

  const typeLabels = {
    ppf: 'Past, Present & Future Reading',
    love: 'Love & Relationships Reading',
    career: 'Career & Finance Reading',
  };

  const title = typeLabels[readingType] || 'Tarot Reading';

  try {
    // Create pending session in DB before payment
    const cardCount = config.CARD_COUNTS[readingType] || 3;
    const { cards, hasJumper } = drawCards(cardCount, readingType);
    
    // Store drawn cards in state (will be delivered after payment)
    userState[telegramId].drawnCards = cards;
    userState[telegramId].hasJumper = hasJumper;

    // Create session
    const session = await db.createSession({
      telegram_id: telegramId,
      reading_type: readingType,
      reader_persona: userState[telegramId]?.selectedReader?.id,
      question: userState[telegramId]?.question,
      cards: serializeCards(cards),
      language: userState[telegramId]?.language || 'en',
      payment_status: isAdmin || readingType === 'daily' ? 'paid' : 'pending',
      is_complete: false,
    });

    userState[telegramId].pendingSessionId = session?.id;

    // ─── ADMIN BYPASS & DAILY FREE CARD: Skip payment ───
    if (isAdmin || readingType === 'daily') {
      if (readingType === 'daily') {
        // Mark daily card as used
        await db.setDailyCardUsed(telegramId);
      } else {
        console.log(`🔓 Admin bypass for user ${telegramId}`);
        await bot.sendMessage(chatId,
          '🔓 *Admin Mode — Payment Bypassed*\n\n🔮 _Channeling the cosmic energy..._',
          { parse_mode: 'Markdown' }
        );
      }
      
      await executeReading(bot, chatId, telegramId, userState);
      return;
    }

    // ─── NORMAL USERS: Send payment invoice ───
    // Create payment record
    await db.createPayment({
      telegram_id: telegramId,
      session_id: session?.id,
      stars_amount: price,
      status: 'pending',
    });

    // Send Telegram Stars invoice
    await bot.sendInvoice(
      chatId,
      title,
      `✨ ${title}\n🔮 ${cardCount} cards + AI interpretation\n🌟 Personalized reading by ${userState[telegramId]?.selectedReader?.name || 'Mystic Reader'}`,
      `session_${session?.id}`,        // payload
      '',                               // provider_token (empty for Stars)
      'XTR',                            // currency (Telegram Stars)
      [{ label: title, amount: price }] // prices
    );
  } catch (error) {
    console.error('Payment invoice error:', error);
    await bot.sendMessage(chatId,
      '❌ An error occurred while setting up payment. Please try again.',
    );
  }
}

/**
 * Execute the reading after successful payment
 */
async function executeReading(bot, chatId, telegramId, userState, sessionId) {
  const typingInterval = await sendTypingAction(bot, chatId, 30000);

  try {
    let session;
    let cards;
    let question;
    let language;
    let reader;

    if (sessionId) {
      // Resume from incomplete session (transaction fallback)
      session = await db.getSessionById(sessionId);
      if (!session) throw new Error('Session not found');
      cards = deserializeCards(session.cards);
      question = session.question;
      language = session.language;
      reader = config.READERS.find((r) => r.id === session.reader_persona);
    } else {
      // Normal flow from state
      cards = userState[telegramId]?.drawnCards;
      question = userState[telegramId]?.question;
      language = userState[telegramId]?.language || 'en';
      reader = userState[telegramId]?.selectedReader;
      session = userState[telegramId]?.pendingSessionId
        ? await db.getSessionById(userState[telegramId].pendingSessionId)
        : null;
    }

    if (!cards || cards.length === 0) {
      throw new Error('No cards drawn');
    }

    const hasJumper = cards.some((c) => c.is_jumper);

    // Send each card image
    for (const card of cards) {
      const imagePath = await getCardImagePath(
        card.card?.filename || card.filename,
        card.is_reversed
      );
      if (imagePath && fs.existsSync(imagePath)) {
        const jumperNote = card.is_jumper ? '⚡ _A card flew from the deck!_\n' : '';
        const cardObj = card.card || card;
        const caption = `${jumperNote}${formatCardDisplay(cardObj, card.is_reversed)}`;
        await bot.sendPhoto(chatId, imagePath, {
          caption,
          parse_mode: 'Markdown',
          protect_content: false,
        });
        await delay(500); // Slight delay between cards for dramatic effect
      }
    }

    if (hasJumper) {
      await bot.sendMessage(chatId,
        '⚡ *A Jumper Card appeared!*\nThis card carries the hidden theme that permeates your entire reading.',
        { parse_mode: 'Markdown' }
      );
    }

    // Get user data for personalization
    const userData = await db.getUser(telegramId);

    // Generate reading via Gemini
    const readingType = session?.reading_type || userState[telegramId]?.readingType;
    const promptData = buildReadingPrompt(readingType, cards, question, reader, userData, language);
    const reading = await generateReading(promptData);

    // Send reading with spoiler/reveal
    const sessionDbId = session?.id || userState[telegramId]?.pendingSessionId;

    // Send the reading in spoiler format
    const spoilerReading = `||${reading}||`;
    try {
      await bot.sendMessage(chatId, spoilerReading, {
        parse_mode: 'MarkdownV2',
        reply_markup: revealReadingKeyboard(sessionDbId),
        protect_content: false,
      });
    } catch {
      // Fallback: send without spoiler if MarkdownV2 fails
      const promptMsg = await bot.sendMessage(chatId,
        '👁 *Your reading is ready!*\n_Tap "Reveal" to see your full interpretation._',
        {
          parse_mode: 'Markdown',
          reply_markup: revealReadingKeyboard(sessionDbId),
        }
      );
      // Store reading for reveal
      if (userState[telegramId]) {
        userState[telegramId].pendingReading = reading;
        userState[telegramId].revealMessageId = promptMsg.message_id;
      }
    }

    // Update session in DB
    if (sessionDbId) {
      await db.updateSession(sessionDbId, {
        gemini_response: reading,
        is_complete: true,
        payment_status: 'paid',
      });
    }

    // Store for follow-up context
    if (userState[telegramId]) {
      userState[telegramId].lastSessionId = sessionDbId;
      userState[telegramId].lastCards = cards;
      userState[telegramId].lastQuestion = question;
      userState[telegramId].lastReading = reading;
      userState[telegramId].drawnCards = null;
      userState[telegramId].currentFlow = null;
    }
  } catch (error) {
    console.error('Execute reading error:', error);
    await bot.sendMessage(chatId,
      '❌ An error occurred while generating your reading. ' +
      'Don\'t worry — your payment is recorded and we\'ll deliver your reading shortly. ' +
      'Type /start to try again.',
    );
  } finally {
    clearInterval(typingInterval);
  }
}

/**
 * Handle the "Reveal" button press
 */
async function handleReveal(bot, callbackQuery, userState) {
  const chatId = callbackQuery.message.chat.id;
  const telegramId = callbackQuery.from.id;
  const sessionId = callbackQuery.data.replace('reveal:', '');

  await bot.answerCallbackQuery(callbackQuery.id, { text: '✨ Revealing your reading...' });

  // Try to delete the message containing the button
  await bot.deleteMessage(chatId, callbackQuery.message.message_id).catch(() => {});

  // Check if we have a pending reading in state
  const pendingReading = userState[telegramId]?.pendingReading;
  if (pendingReading) {
    await sendSplitMessage(bot, chatId, pendingReading, {
      parse_mode: 'Markdown',
      reply_markup: followUpKeyboard(sessionId),
      protect_content: false,
    });
    userState[telegramId].pendingReading = null;
    userState[telegramId].revealMessageId = null;
    return;
  }

  // Otherwise fetch from DB
  const session = await db.getSessionById(sessionId);
  if (session?.gemini_response) {
    await sendSplitMessage(bot, chatId, session.gemini_response, {
      parse_mode: 'Markdown',
      reply_markup: followUpKeyboard(sessionId),
      protect_content: false,
    });
  } else {
    await bot.sendMessage(chatId,
      '🔮 Your reading has already been revealed! Use the follow-up button to ask more.',
      { reply_markup: followUpKeyboard(sessionId) }
    );
  }
}

module.exports = {
  handlePremiumReading,
  sendReaderCarousel,
  handleReaderSelection,
  handleReaderConfirmation,
  promptPremiumQuestion,
  handleQuestionReceived,
  handleStopShuffle,
  executeReading,
  handleReveal,
};
