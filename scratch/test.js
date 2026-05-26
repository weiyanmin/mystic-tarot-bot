const { handleStart } = require('../src/handlers/startHandler');
const msg = {
  chat: { id: 123456 },
  from: { id: 123456, username: 'testuser', first_name: 'Test' },
  text: '/start'
};
const bot = {
  sendMessage: async (chatId, text, options) => {
    console.log('sendMessage called:', text);
  },
  emit: (event, msg, session) => {
    console.log('emit called:', event);
  }
};
handleStart(bot, msg).then(() => console.log('Done')).catch(e => console.error('Error:', e));
