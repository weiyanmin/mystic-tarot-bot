/**
 * Gemini API Service
 * Handles all AI text generation with context management
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature: 0.85,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 800,
  },
});

/**
 * Generate a tarot reading response from Gemini
 * @param {Object} promptData - { systemInstruction, userMessage }
 * @returns {Promise<string>} The generated reading text
 */
async function generateReading(promptData) {
  try {
    const chat = model.startChat({
      systemInstruction: {
        role: 'user',
        parts: [{ text: promptData.systemInstruction }],
      },
      history: [],
    });

    const result = await chat.sendMessage(promptData.userMessage);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);

    if (error.message?.includes('SAFETY')) {
      return '🔮 The cards have spoken, but the message requires careful interpretation. The energy surrounding your question is complex. Please try rephrasing your question for clearer guidance.';
    }

    throw new Error('Failed to generate reading. Please try again.');
  }
}

/**
 * Generate a follow-up reading with full conversation context
 * @param {Object} promptData - { systemInstruction, userMessage }
 * @param {Array} previousContext - Previous messages for context
 * @returns {Promise<string>}
 */
async function generateFollowUpReading(promptData, previousContext = []) {
  try {
    const history = previousContext.map((ctx) => ({
      role: ctx.role,
      parts: [{ text: ctx.text }],
    }));

    const chat = model.startChat({
      systemInstruction: {
        role: 'user',
        parts: [{ text: promptData.systemInstruction }],
      },
      history,
    });

    const result = await chat.sendMessage(promptData.userMessage);
    return result.response.text();
  } catch (error) {
    console.error('Gemini Follow-Up API error:', error);
    throw new Error('Failed to generate follow-up reading. Please try again.');
  }
}

module.exports = {
  generateReading,
  generateFollowUpReading,
};
