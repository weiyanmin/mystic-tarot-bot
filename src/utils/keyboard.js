/**
 * Inline Keyboard Builders
 * Creates Telegram inline keyboard markup for all bot interactions
 */

const config = require('../config');

/**
 * Main menu keyboard (persistent reply keyboard)
 */
function mainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: '🃏 Draw Daily Free Card' }],
      [{ text: '✨ Quick Yes/No' }],
      [{ text: '⏳ Past, Present, Future' }],
      [{ text: '❤️ Love & Relationships' }],
      [{ text: '💼 Career & Finance' }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

/**
 * Reader selection inline keyboard
 */
function readerSelectionKeyboard() {
  const buttons = config.READERS.map((reader) => [
    {
      text: `${reader.name}\n${reader.description}`,
      callback_data: `select_reader:${reader.id}`,
    },
  ]);

  return { inline_keyboard: buttons };
}

/**
 * "Stop & Draw Cards" button (during shuffle animation)
 */
function stopShuffleKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🛑 Stop & Draw Cards', callback_data: 'stop_shuffle' }],
    ],
  };
}

/**
 * "Reveal Reading" button (over spoiler text)
 */
function revealReadingKeyboard(sessionId) {
  return {
    inline_keyboard: [
      [{ text: '👁 Reveal Your Reading', callback_data: `reveal:${sessionId}` }],
    ],
  };
}

/**
 * "Ask Follow-Up" button after reading delivery
 */
function followUpKeyboard(sessionId) {
  return {
    inline_keyboard: [
      [{ text: '🔮 Ask a Follow-Up Question', callback_data: `followup:${sessionId}` }],
      [{ text: '🏠 Back to Menu', callback_data: 'back_to_menu' }],
    ],
  };
}

/**
 * Payment confirmation keyboard
 */
function paymentKeyboard(readingType) {
  const price = readingType === 'yes_no'
    ? config.PRICE_QUICK_READING
    : config.PRICE_DEEP_READING;

  return {
    inline_keyboard: [
      [{ text: `⭐ Pay ${price} Stars`, pay: true }],
      [{ text: '❌ Cancel', callback_data: 'cancel_payment' }],
    ],
  };
}

/**
 * Referral share keyboard
 */
function referralKeyboard(referralLink) {
  return {
    inline_keyboard: [
      [{ text: '📤 Share Your Referral Link', url: referralLink }],
    ],
  };
}

/**
 * Back to menu keyboard
 */
function backToMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🏠 Back to Menu', callback_data: 'back_to_menu' }],
    ],
  };
}

/**
 * Deeper meaning upsell keyboard
 */
function deeperMeaningKeyboard(sessionId) {
  return {
    inline_keyboard: [
      [{ text: '🔮 Go Deeper (5 Cards)', callback_data: `deeper:${sessionId}` }],
      [{ text: '✅ This is enough', callback_data: `followup:${sessionId}` }],
    ],
  };
}

module.exports = {
  mainMenuKeyboard,
  readerSelectionKeyboard,
  stopShuffleKeyboard,
  revealReadingKeyboard,
  followUpKeyboard,
  paymentKeyboard,
  referralKeyboard,
  backToMenuKeyboard,
  deeperMeaningKeyboard,
};
