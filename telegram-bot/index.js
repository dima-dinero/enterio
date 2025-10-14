require('dotenv').config({ path: '../.env' });
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FLOWISE_URL = process.env.FLOWISE_URL;
const CHATFLOW_ID = process.env.CHATFLOW_ID;

if (!TELEGRAM_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN not found in .env file');
  process.exit(1);
}

if (!CHATFLOW_ID) {
  console.error('Error: CHATFLOW_ID not found in .env file');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('Telegram bot started');
console.log(`Flowise URL: ${FLOWISE_URL}`);
console.log(`Chatflow ID: ${CHATFLOW_ID}`);

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || '';

  bot.sendMessage(
    chatId,
    `Здравствуйте, ${firstName}! 👋\n\nМеня зовут Андрей. Я виртуальный AI-ассистент компании Enterio. Чем могу помочь?`
  );
});

bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/')) {
    return;
  }

  const chatId = msg.chat.id;
  const userMessage = msg.text;

  if (!userMessage) {
    return;
  }

  await bot.sendChatAction(chatId, 'typing');

  try {
    const response = await axios.post(
      `${FLOWISE_URL}/api/v1/prediction/${CHATFLOW_ID}`,
      {
        question: userMessage,
        overrideConfig: {
          sessionId: `telegram_${chatId}`,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Origin: FLOWISE_URL,
        },
      }
    );

    const botReply =
      response.data.text ||
      response.data.answer ||
      'Извините, временно не могу вам ответить.';

    await bot.sendMessage(chatId, botReply);
  } catch (error) {
    console.error('Flowise request error:', error.message);

    await bot.sendMessage(
      chatId,
      '😔 Извините, произошла ошибка. Попробуйте позже или свяжитесь с нами напрямую.'
    );
  }
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

console.log('Bot ready to receive messages!');
