/**
 * Shared Utility Functions
 */

const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
  'ar', 'hi', 'th', 'vi', 'tr', 'pl', 'nl', 'sv', 'da', 'no',
  'fi', 'id', 'ms', 'tl', 'uk', 'cs', 'ro', 'hu', 'el', 'he',
  'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'my', 'km', 'lo',
];

/**
 * Detect/validate a language input from the user
 * Returns ISO code or 'en' as fallback
 */
function detectLanguage(input) {
  if (!input) return 'en';

  const cleaned = input.trim().toLowerCase();

  // Direct ISO code match
  if (SUPPORTED_LANGUAGES.includes(cleaned)) return cleaned;

  // Common language name mappings
  const nameMap = {
    english: 'en', spanish: 'es', español: 'es', french: 'fr', français: 'fr',
    german: 'de', deutsch: 'de', italian: 'it', italiano: 'it',
    portuguese: 'pt', português: 'pt', russian: 'ru', русский: 'ru',
    japanese: 'ja', '日本語': 'ja', korean: 'ko', '한국어': 'ko',
    chinese: 'zh', '中文': 'zh', arabic: 'ar', 'العربية': 'ar',
    hindi: 'hi', 'हिन्दी': 'hi', thai: 'th', 'ไทย': 'th',
    vietnamese: 'vi', 'tiếng việt': 'vi', turkish: 'tr', türkçe: 'tr',
    polish: 'pl', polski: 'pl', dutch: 'nl', nederlands: 'nl',
    swedish: 'sv', svenska: 'sv', danish: 'da', dansk: 'da',
    norwegian: 'no', norsk: 'no', finnish: 'fi', suomi: 'fi',
    indonesian: 'id', 'bahasa indonesia': 'id', malay: 'ms', 'bahasa melayu': 'ms',
    filipino: 'tl', tagalog: 'tl', ukrainian: 'uk', 'українська': 'uk',
    czech: 'cs', čeština: 'cs', romanian: 'ro', română: 'ro',
    hungarian: 'hu', magyar: 'hu', greek: 'el', 'ελληνικά': 'el',
    hebrew: 'he', 'עברית': 'he', bengali: 'bn', 'বাংলা': 'bn',
    tamil: 'ta', 'தமிழ்': 'ta', burmese: 'my', 'မြန်မာ': 'my',
    myanmar: 'my', khmer: 'km', 'ខ្មែរ': 'km', lao: 'lo', 'ລາວ': 'lo',
  };

  if (nameMap[cleaned]) return nameMap[cleaned];

  // Fuzzy match: check if input starts with a known language name
  for (const [name, code] of Object.entries(nameMap)) {
    if (cleaned.startsWith(name) || name.startsWith(cleaned)) {
      return code;
    }
  }

  return null; // Unsupported — caller should handle fallback + logging
}

/**
 * Send typing action to show bot is processing
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId
 * @param {number} durationMs - How long to show typing (in ms)
 */
async function sendTypingAction(bot, chatId, durationMs = 5000) {
  const interval = setInterval(() => {
    bot.sendChatAction(chatId, 'typing').catch(() => {});
  }, 4000);

  // Send immediately
  await bot.sendChatAction(chatId, 'typing').catch(() => {});

  // Auto-clear after duration
  setTimeout(() => clearInterval(interval), durationMs);

  return interval;
}

/**
 * Escape Telegram MarkdownV2 special characters
 */
function escapeMarkdown(text) {
  // For MarkdownV2, these characters need escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
  // But we want to preserve intentional formatting, so we use Markdown parse mode instead
  return text;
}

/**
 * Format a card name with orientation emoji
 */
function formatCardDisplay(card, isReversed) {
  const orientation = isReversed ? '↻ Reversed' : '✦ Upright';
  return `*${card.name}* (${orientation})`;
}

/**
 * Create a delay (for animation timing)
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a unique referral link
 */
function generateReferralLink(botUsername, referralCode) {
  return `https://t.me/${botUsername}?start=ref_${referralCode}`;
}

/**
 * Send long messages by splitting them to avoid Telegram's 4096 character limit
 */
async function sendSplitMessage(bot, chatId, text, options = {}) {
  const maxLength = 4000;
  
  if (text.length <= maxLength) {
    return bot.sendMessage(chatId, text, options);
  }

  // Split by double newline first to preserve paragraphs
  const paragraphs = text.split('\n\n');
  let currentChunk = '';
  const chunks = [];

  for (const p of paragraphs) {
    if (currentChunk.length + p.length + 2 <= maxLength) {
      currentChunk += (currentChunk ? '\n\n' : '') + p;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      
      // If a single paragraph is too long, split by newline
      if (p.length > maxLength) {
        const lines = p.split('\n');
        let tempChunk = '';
        for (const l of lines) {
           if (tempChunk.length + l.length + 1 <= maxLength) {
             tempChunk += (tempChunk ? '\n' : '') + l;
           } else {
             if (tempChunk) chunks.push(tempChunk);
             // If a single line is too long, split by characters
             if (l.length > maxLength) {
               for (let i = 0; i < l.length; i += maxLength) {
                 chunks.push(l.substring(i, i + maxLength));
               }
               tempChunk = '';
             } else {
               tempChunk = l;
             }
           }
        }
        if (tempChunk) currentChunk = tempChunk;
      } else {
        currentChunk = p;
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  let lastMessage;
  for (let i = 0; i < chunks.length; i++) {
    // Only add reply_markup to the last chunk
    const currentOptions = { ...options };
    if (i < chunks.length - 1 && currentOptions.reply_markup) {
      delete currentOptions.reply_markup;
    }
    lastMessage = await bot.sendMessage(chatId, chunks[i], currentOptions);
    await delay(300); // Prevent hitting rate limits
  }
  return lastMessage;
}

module.exports = {
  detectLanguage,
  sendTypingAction,
  escapeMarkdown,
  formatCardDisplay,
  delay,
  generateReferralLink,
  sendSplitMessage,
  SUPPORTED_LANGUAGES,
};
