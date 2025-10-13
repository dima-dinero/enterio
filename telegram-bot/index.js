require('dotenv').config({ path: '../.env' });
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FLOWISE_URL = process.env.FLOWISE_URL;
const CHATFLOW_ID = process.env.CHATFLOW_ID;

if (!TELEGRAM_TOKEN) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в .env файле');
  process.exit(1);
}

if (!CHATFLOW_ID) {
  console.error('❌ Ошибка: CHATFLOW_ID не найден в .env файле');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('✅ Telegram бот запущен!');
console.log(`📡 Flowise URL: ${FLOWISE_URL}`);
console.log(`🤖 Chatflow ID: ${CHATFLOW_ID}`);

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

  console.log(
    `📩 Получено сообщение от ${msg.from.first_name}: ${userMessage}`
  );

  try {
    const response = await axios.post(
      `${FLOWISE_URL}/api/v1/prediction/${CHATFLOW_ID}`,
      {
        question: userMessage,
        overrideConfig: {
          sessionId: `telegram_${chatId}`,
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
