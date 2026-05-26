/**
 * Image Service
 * Handles card image rotation for reversed cards using Sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const CARDS_DIR = path.join(__dirname, '..', '..', 'Cards-png');
const TEMP_DIR = path.join(__dirname, '..', '..', 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Get the card image path (rotate 180° if reversed)
 * @param {string} filename - Card image filename
 * @param {boolean} isReversed - Whether to rotate the image
 * @returns {Promise<string>} Path to the (possibly rotated) image
 */
async function getCardImagePath(filename, isReversed) {
  const originalPath = path.join(CARDS_DIR, filename);

  if (!fs.existsSync(originalPath)) {
    console.error(`Card image not found: ${originalPath}`);
    return null;
  }

  if (!isReversed) {
    return originalPath;
  }

  // Create a reversed version in temp directory
  const reversedFilename = `reversed_${filename}`;
  const reversedPath = path.join(TEMP_DIR, reversedFilename);

  // Check if we already have a cached reversed version
  if (fs.existsSync(reversedPath)) {
    return reversedPath;
  }

  try {
    await sharp(originalPath)
      .rotate(180)
      .toFile(reversedPath);

    return reversedPath;
  } catch (error) {
    console.error(`Error rotating card image: ${error.message}`);
    return originalPath; // Fall back to original if rotation fails
  }
}

/**
 * Get the card back image path
 * @returns {string}
 */
function getCardBackPath() {
  return path.join(CARDS_DIR, 'CardBacks.png');
}

/**
 * Get the shuffling GIF path
 * @returns {string}
 */
function getShuffleGifPath() {
  return path.join(__dirname, '..', '..', 'tarot_shuffle.gif');
}

/**
 * Clean up old temp files (call periodically)
 */
function cleanupTempFiles() {
  if (!fs.existsSync(TEMP_DIR)) return;

  const files = fs.readdirSync(TEMP_DIR);
  const now = Date.now();
  const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

  for (const file of files) {
    const filePath = path.join(TEMP_DIR, file);
    const stat = fs.statSync(filePath);
    if (now - stat.mtimeMs > MAX_AGE) {
      fs.unlinkSync(filePath);
    }
  }
}

module.exports = {
  getCardImagePath,
  getCardBackPath,
  getShuffleGifPath,
  cleanupTempFiles,
};
