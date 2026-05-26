/**
 * Payment Handler
 * Telegram Stars payment flow: pre_checkout_query + successful_payment
 * Includes referral reward logic on first purchase
 */

const db = require('../services/supabaseService');
const { executeReading } = require('./premiumHandler');
const { executeFollowUpReading } = require('./followUpHandler');
const { executeYesNoReading } = require('./yesNoHandler');

/**
 * Handle pre_checkout_query — must respond within 10 seconds
 * This is where you validate the payment before Telegram processes it
 */
async function handlePreCheckout(bot, query) {
  try {
    await bot.answerPreCheckoutQuery(query.id, true);
  } catch (error) {
    console.error('Pre-checkout error:', error);
    try {
      await bot.answerPreCheckoutQuery(query.id, false, {
        error_message: 'Payment processing error. Please try again.',
      });
    } catch (e) {
      console.error('Failed to reject pre-checkout:', e);
    }
  }
}

/**
 * Handle successful_payment — deliver the reading
 */
async function handleSuccessfulPayment(bot, msg, userState) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const payment = msg.successful_payment;
  const payload = payment.invoice_payload || '';
  const isFollowUp = payload.startsWith('followup_');
  const isYesNo = payload.startsWith('yesno_');

  console.log('Payment received:', {
    telegramId,
    amount: payment.total_amount,
    currency: payment.currency,
    chargeId: payment.telegram_payment_charge_id,
    payload,
  });

  try {
    // Update payment record in DB
    await db.completePayment(
      payment.telegram_payment_charge_id,
      payment.provider_payment_charge_id
    );

    // Update session payment status
    let sessionId = userState[telegramId]?.pendingSessionId;
    if (isFollowUp) sessionId = payload.replace('followup_', '');
    else if (isYesNo) sessionId = payload.replace('yesno_', '');
    else if (payload.startsWith('session_')) sessionId = payload.replace('session_', '');
      
    if (sessionId) {
      await db.updateSession(sessionId, { payment_status: 'paid' });
    }

    // Check for first purchase referral reward
    const user = await db.getUser(telegramId);
    if (user && !user.first_purchase_done && user.referred_by) {
      const referrer = await db.getUserByReferralCode(user.referred_by);
      if (referrer) {
        await db.createReferralReward(referrer.telegram_id, telegramId);
        await db.markFirstPurchase(telegramId);

        try {
          await bot.sendMessage(referrer.telegram_id,
            '🎉 *Referral Reward!*\n\n' +
            'A friend you referred just made their first purchase! ' +
            'You\'ve earned a *free reading*! 🌟\n\n' +
            '_Your reward will be applied to your next reading._',
            { parse_mode: 'Markdown' }
          );
        } catch {
          // Referrer may have blocked the bot
        }
      }
    } else if (user && !user.first_purchase_done) {
      await db.markFirstPurchase(telegramId);
    }

    // Confirm payment to user
    await bot.sendMessage(chatId,
      '✅ *Payment received!*\n\n' +
      '🔮 _Channeling the cosmic energy to deliver your reading..._',
      { parse_mode: 'Markdown' }
    );

    // Execute the reading delivery
    if (isFollowUp) {
      const followUpQuestion = userState[telegramId]?.pendingFollowUpQuestion;
      await executeFollowUpReading(bot, chatId, telegramId, userState, sessionId, followUpQuestion);
    } else if (isYesNo) {
      await executeYesNoReading(bot, chatId, telegramId, null, null, userState, sessionId);
    } else {
      await executeReading(bot, chatId, telegramId, userState);
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    await bot.sendMessage(chatId,
      '⚠️ Payment received but there was an error delivering your reading. ' +
      'Don\'t worry — your payment is saved. Type /start and your reading will be delivered automatically.'
    );
  }
}

/**
 * Handle payment cancellation
 */
async function handlePaymentCancel(bot, callbackQuery, userState) {
  const chatId = callbackQuery.message.chat.id;
  const telegramId = callbackQuery.from.id;

  await bot.answerCallbackQuery(callbackQuery.id, { text: 'Payment cancelled' });

  // Clean up state
  if (userState[telegramId]) {
    userState[telegramId].currentFlow = null;
    userState[telegramId].drawnCards = null;
    userState[telegramId].pendingSessionId = null;
  }

  await bot.sendMessage(chatId,
    '❌ Payment cancelled. Your cards have been returned to the deck.\n\n' +
    '_You can start a new reading anytime from the menu._',
    { parse_mode: 'Markdown' }
  );
}

module.exports = {
  handlePreCheckout,
  handleSuccessfulPayment,
  handlePaymentCancel,
};
