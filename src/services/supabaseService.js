/**
 * Supabase Database Service
 * All database operations for users, sessions, payments, referrals
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

// ─── USER OPERATIONS ────────────────────────────────────────

async function getUser(telegramId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user:', error);
  }
  return data;
}

async function createUser(telegramId, username, firstName) {
  const referralCode = generateReferralCode(telegramId);
  const { data, error } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramId,
      username: username || null,
      first_name: firstName || null,
      referral_code: referralCode,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  return data;
}

async function getOrCreateUser(telegramId, username, firstName) {
  let user = await getUser(telegramId);
  if (!user) {
    user = await createUser(telegramId, username, firstName);
  }
  return user;
}

async function updateUserLanguage(telegramId, language) {
  const { error } = await supabase
    .from('users')
    .update({ language, updated_at: new Date().toISOString() })
    .eq('telegram_id', telegramId);

  if (error) console.error('Error updating language:', error);
}

async function updateUserProfile(telegramId, displayName, dateOfBirth) {
  const { error } = await supabase
    .from('users')
    .update({
      display_name: displayName,
      date_of_birth: dateOfBirth,
      is_onboarded: true,
      updated_at: new Date().toISOString(),
    })
    .eq('telegram_id', telegramId);

  if (error) console.error('Error updating profile:', error);
}

async function setDailyCardUsed(telegramId) {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('users')
    .update({ free_daily_used_at: today, updated_at: new Date().toISOString() })
    .eq('telegram_id', telegramId);

  if (error) console.error('Error setting daily card used:', error);
}

async function hasDailyCardBeenUsed(telegramId) {
  const user = await getUser(telegramId);
  if (!user || !user.free_daily_used_at) return false;
  const today = new Date().toISOString().split('T')[0];
  return user.free_daily_used_at === today;
}

async function hasYesNoBeenUsed(telegramId) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('reading_sessions')
    .select('id')
    .eq('telegram_id', telegramId)
    .eq('reading_type', 'yes_no')
    .eq('payment_status', 'free')
    .gte('created_at', `${today}T00:00:00.000Z`)
    .limit(1);

  if (error) {
    console.error('Error checking yes/no usage:', error);
    return false;
  }
  return data && data.length > 0;
}

async function setReferredBy(telegramId, referralCode) {
  const { error } = await supabase
    .from('users')
    .update({ referred_by: referralCode })
    .eq('telegram_id', telegramId);

  if (error) console.error('Error setting referral:', error);
}

async function markFirstPurchase(telegramId) {
  const { error } = await supabase
    .from('users')
    .update({ first_purchase_done: true, updated_at: new Date().toISOString() })
    .eq('telegram_id', telegramId);

  if (error) console.error('Error marking first purchase:', error);
}

async function getUserByReferralCode(referralCode) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('referral_code', referralCode)
    .single();

  if (error) return null;
  return data;
}

async function getAllUsersForNotification() {
  const { data, error } = await supabase
    .from('users')
    .select('telegram_id, language, first_name, display_name');

  if (error) {
    console.error('Error fetching users for notification:', error);
    return [];
  }
  return data || [];
}

// ─── SESSION OPERATIONS ─────────────────────────────────────

async function createSession(sessionData) {
  const { data, error } = await supabase
    .from('reading_sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    return null;
  }
  return data;
}

async function updateSession(sessionId, updates) {
  const { error } = await supabase
    .from('reading_sessions')
    .update(updates)
    .eq('id', sessionId);

  if (error) console.error('Error updating session:', error);
}

async function getIncompleteSession(telegramId) {
  const { data, error } = await supabase
    .from('reading_sessions')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('is_complete', false)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

async function getSessionById(sessionId) {
  const { data, error } = await supabase
    .from('reading_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) return null;
  return data;
}

// ─── PAYMENT OPERATIONS ─────────────────────────────────────

async function createPayment(paymentData) {
  const { data, error } = await supabase
    .from('payments')
    .insert(paymentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating payment:', error);
    return null;
  }
  return data;
}

async function completePayment(telegramPaymentChargeId, providerPaymentChargeId) {
  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      telegram_payment_charge_id: telegramPaymentChargeId,
      provider_payment_charge_id: providerPaymentChargeId,
    })
    .eq('telegram_payment_charge_id', telegramPaymentChargeId)
    .select()
    .single();

  if (error) {
    console.error('Error completing payment:', error);
    return null;
  }
  return data;
}

async function getPendingPayment(telegramId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

// ─── LANGUAGE LOG ────────────────────────────────────────────

async function logLanguageAttempt(telegramId, attemptedLanguage, resolvedTo) {
  const { error } = await supabase
    .from('language_logs')
    .insert({
      telegram_id: telegramId,
      attempted_language: attemptedLanguage,
      resolved_to: resolvedTo,
    });

  if (error) console.error('Error logging language attempt:', error);
}

// ─── REFERRAL OPERATIONS ────────────────────────────────────

async function createReferralReward(referrerTelegramId, referredTelegramId) {
  const { error } = await supabase
    .from('referral_rewards')
    .insert({
      referrer_telegram_id: referrerTelegramId,
      referred_telegram_id: referredTelegramId,
      reward_type: 'free_reading',
    });

  if (error) console.error('Error creating referral reward:', error);
}

async function getUnclaimedRewards(telegramId) {
  const { data, error } = await supabase
    .from('referral_rewards')
    .select('*')
    .eq('referrer_telegram_id', telegramId)
    .eq('is_claimed', false);

  if (error) return [];
  return data || [];
}

async function claimReward(rewardId) {
  const { error } = await supabase
    .from('referral_rewards')
    .update({ is_claimed: true })
    .eq('id', rewardId);

  if (error) console.error('Error claiming reward:', error);
}

// ─── HELPERS ─────────────────────────────────────────────────

function generateReferralCode(telegramId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${code}${String(telegramId).slice(-4)}`;
}

module.exports = {
  supabase,
  getUser,
  createUser,
  getOrCreateUser,
  updateUserLanguage,
  updateUserProfile,
  setDailyCardUsed,
  hasDailyCardBeenUsed,
  hasYesNoBeenUsed,
  setReferredBy,
  markFirstPurchase,
  getUserByReferralCode,
  getAllUsersForNotification,
  createSession,
  updateSession,
  getIncompleteSession,
  getSessionById,
  createPayment,
  completePayment,
  getPendingPayment,
  logLanguageAttempt,
  createReferralReward,
  getUnclaimedRewards,
  claimReward,
};
