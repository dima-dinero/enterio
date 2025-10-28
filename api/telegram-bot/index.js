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
    console.error(`Error: ${key} not found in environment variables`);
    process.exit(1);
  }
});

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FLOWISE_URL = process.env.FLOWISE_URL;
const CHATFLOW_ID = process.env.CHATFLOW_ID;
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY;

const userLastMessage = new Map();
const conversationHistory = new Map();
const RATE_LIMIT_MS = 3000;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 20;

function sanitizeText(text) {
  if (!text) return text;
  return Buffer.from(text, 'utf8').toString('utf8');
}

function logFlowiseRequest(chatId, question, history) {
  const turnCount = Math.floor(history.length / 2);
  console.log(
    `[Telegram] Flowise request chatId=${chatId} historyTurns=${turnCount} questionLength=${question.length}`
  );
}

function logFlowiseResponse(chatId, answer) {
  console.log(
    `[Telegram] Flowise response chatId=${chatId} replyLength=${answer.length}`
  );
}

function getHistory(chatId) {
  return conversationHistory.get(chatId) || [];
}

function saveTurn(chatId, userMessage, botReply) {
  const existing = conversationHistory.get(chatId) || [];
  const updated = existing.concat([
    ['user', userMessage],
    ['assistant', botReply],
  ]);
  const maxEntries = MAX_HISTORY_TURNS * 2;
  const trimmed =
    updated.length > maxEntries
      ? updated.slice(updated.length - maxEntries)
      : updated;
  conversationHistory.set(chatId, trimmed);
  console.log(
    `[Telegram] Stored history chatId=${chatId} messages=${trimmed.length}`
  );
}

function resetHistory(chatId) {
  conversationHistory.delete(chatId);
  console.log(`[Telegram] History reset chatId=${chatId}`);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('✅ Telegram bot started and ready');

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || '';

  resetHistory(chatId);

  bot.sendMessage(
    chatId,
    `Привет, ${firstName}!\n\nЕсли нужна моя помощь с ремонтом или дизайном интерьера — обращайся. Буду рад помочь 😉`
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
    const sanitizedMessage = sanitizeText(userMessage);
    const history = getHistory(chatId);
    logFlowiseRequest(chatId, sanitizedMessage, history);

    const response = await axios.post(
      `${FLOWISE_URL}/api/v1/prediction/${CHATFLOW_ID}`,
      {
        question: sanitizedMessage,
        history,
        overrideConfig: {
          sessionId: `telegram_${chatId}`,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...(FLOWISE_API_KEY && {
            Authorization: `Bearer ${FLOWISE_API_KEY}`,
          }),
        },
        responseEncoding: 'utf8',
      }
    );

    const botReply =
      response.data.text ||
      response.data.answer ||
      'Извините, временно не могу вам ответить.';

    saveTurn(chatId, sanitizedMessage, botReply);
    logFlowiseResponse(chatId, botReply);

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
