/**
 * Daily Reminder Cron Job
 * Sends push notifications to all users for daily free card
 */

const cron = require('node-cron');
const db = require('../src/services/supabaseService');

function startDailyReminder(bot) {
  // Run every day at 8:00 AM UTC
  cron.schedule('0 8 * * *', async () => {
    console.log('📢 Running daily reminder cron job...');

    try {
      const users = await db.getAllUsersForNotification();
      let sent = 0;
      let failed = 0;

      for (const user of users) {
        try {
          const name = user.display_name || user.first_name || 'Seeker';
          const messages = [
            `🌅 Good morning, ${name}! Your daily tarot card awaits. What will the universe reveal today? 🔮`,
            `✨ ${name}, the cards are whispering your name. Draw your free daily card! 🃏`,
            `🌙 The cosmic energy is strong today, ${name}. See what guidance awaits you! 🔮`,
            `🃏 ${name}, your daily free card reading is ready. Tap to discover today's message! ✨`,
          ];

          const randomMsg = messages[Math.floor(Math.random() * messages.length)];
          await bot.sendMessage(user.telegram_id, randomMsg);
          sent++;

          // Rate limit: small delay between messages
          await new Promise((r) => setTimeout(r, 50));
        } catch (err) {
          // User might have blocked the bot
          failed++;
        }
      }

      console.log(`📢 Daily reminder sent: ${sent} success, ${failed} failed`);
    } catch (error) {
      console.error('Daily reminder cron error:', error);
    }
  });

  console.log('⏰ Daily reminder cron job scheduled (8:00 AM UTC)');
}

module.exports = { startDailyReminder };
