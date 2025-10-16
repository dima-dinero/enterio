require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const requiredEnvVars = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  FLOWISE_URL: process.env.FLOWISE_URL,
  CHATFLOW_ID: process.env.CHATFLOW_ID,
};

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    console.error(`❌ Error: ${key} not found in environment variables`);
    process.exit(1);
  }
});

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FLOWISE_URL = process.env.FLOWISE_URL;
const CHATFLOW_ID = process.env.CHATFLOW_ID;
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY;

const userLastMessage = new Map();
const RATE_LIMIT_MS = 3000;
const MAX_MESSAGE_LENGTH = 2000;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('✅ Telegram bot started and ready');

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
    await bot.sendMessage(
      chatId,
      '📝 Пожалуйста, отправьте текстовое сообщение. Я пока не умею обрабатывать медиафайлы.'
    );
    return;
  }

  if (userMessage.length > MAX_MESSAGE_LENGTH) {
    await bot.sendMessage(
      chatId,
      `⚠️ Сообщение слишком длинное (${userMessage.length} символов). Пожалуйста, сократите до ${MAX_MESSAGE_LENGTH} символов.`
    );
    return;
  }

  const now = Date.now();
  const lastMessageTime = userLastMessage.get(chatId) || 0;

  if (now - lastMessageTime < RATE_LIMIT_MS) {
    return;
  }

  userLastMessage.set(chatId, now);

  const typingInterval = setInterval(() => {
    bot.sendChatAction(chatId, 'typing').catch(() => {});
  }, 4000);

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

    clearInterval(typingInterval);
    await bot.sendMessage(chatId, botReply);
  } catch (error) {
    clearInterval(typingInterval);

    console.error('❌ Flowise API error:', error.message);

    await bot.sendMessage(
      chatId,
      '😔 Извините, произошла ошибка. Попробуйте позже или свяжитесь с нами напрямую.'
    );
  }
});

bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error.message);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  bot.stopPolling();
  process.exit(0);
});
