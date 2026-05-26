/**
 * Referral Handler
 * Generate referral links, track referrals, claim rewards
 */

const db = require('../services/supabaseService');
const { generateReferralLink } = require('../utils/helpers');
const { referralKeyboard, backToMenuKeyboard } = require('../utils/keyboard');
const config = require('../config');

async function handleReferral(bot, msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  const user = await db.getUser(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, 'Please type /start first to get started.');
    return;
  }

  const referralLink = generateReferralLink(config.BOT_USERNAME, user.referral_code);
  const rewards = await db.getUnclaimedRewards(telegramId);

  let rewardText = '';
  if (rewards.length > 0) {
    rewardText = `\n\n🎁 *You have ${rewards.length} unclaimed reward(s)!*\n_These will be applied to your next reading._`;
  }

  await bot.sendMessage(chatId,
    '📤 *Your Referral Program*\n\n' +
    'Share your unique link with friends:\n' +
    `\`${referralLink}\`\n\n` +
    '✨ *How it works:*\n' +
    '1. Share your link with a friend\n' +
    '2. They sign up and make their first Stars purchase\n' +
    '3. You earn a *free reading*! 🌟\n' +
    `${rewardText}`,
    {
      parse_mode: 'Markdown',
      reply_markup: referralKeyboard(referralLink),
    }
  );
}

module.exports = { handleReferral };
