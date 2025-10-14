require('dotenv').config({ path: '/app/.env' });
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FLOWISE_URL = process.env.FLOWISE_URL;
const CHATFLOW_ID = process.env.CHATFLOW_ID;
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY;

if (!TELEGRAM_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN not found in .env file');
  process.exit(1);
}

if (!CHATFLOW_ID) {
  console.error('Error: CHATFLOW_ID not found in .env file');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('✅ Telegram бот запущен!');
console.log(`📡 Flowise URL: ${FLOWISE_URL}`);
console.log(`🤖 Chatflow ID: ${CHATFLOW_ID}`);
console.log(
  `🔑 API Key: ${FLOWISE_API_KEY ? '✅ Установлен' : '❌ Не найден'}`
);
console.log('🔄 Бот готов принимать сообщения...');

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
  const userName = msg.from.first_name || 'Пользователь';

  if (!userMessage) {
    return;
  }

  console.log(`📩 Получено сообщение от ${userName}: ${userMessage}`);

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
          ...(FLOWISE_API_KEY && {
            Authorization: `Bearer ${FLOWISE_API_KEY}`,
          }),
        },
      }
    );

    const botReply =
      response.data.text ||
      response.data.answer ||
      'Извините, временно не могу вам ответить.';

    console.log(`✅ Ответ отправлен: ${botReply.substring(0, 50)}...`);
    await bot.sendMessage(chatId, botReply);
  } catch (error) {
    console.error('❌ Ошибка при обращении к Flowise:', error.message);
    if (error.response) {
      console.error('📊 Статус:', error.response.status);
      console.error('📊 Данные:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('📡 Запрос был отправлен, но ответа не получено');
      console.error(
        '🔍 URL:',
        `${FLOWISE_URL}/api/v1/prediction/${CHATFLOW_ID}`
      );
    } else {
      console.error('⚠️ Ошибка настройки запроса:', error.message);
    }

    await bot.sendMessage(
      chatId,
      '😔 Извините, произошла ошибка. Попробуйте позже или свяжитесь с нами напрямую.'
    );
  }
});

bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error.message);
});

console.log('🔄 Бот готов принимать сообщения...');
