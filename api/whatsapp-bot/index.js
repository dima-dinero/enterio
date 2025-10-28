require('dotenv').config();
const express = require('express');
const axios = require('axios');

const requiredEnvVars = {
  WAZZUP_API_KEY: process.env.WAZZUP_API_KEY,
  WAZZUP_CHANNEL_ID: process.env.WAZZUP_CHANNEL_ID,
  FLOWISE_URL: process.env.FLOWISE_URL,
  CHATFLOW_ID: process.env.CHATFLOW_ID,
};

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    console.error(`❌ Error: ${key} not found in environment variables`);
    process.exit(1);
  }
});

const WAZZUP_API_KEY = process.env.WAZZUP_API_KEY;
const WAZZUP_CHANNEL_ID = process.env.WAZZUP_CHANNEL_ID;
const FLOWISE_URL = process.env.FLOWISE_URL;
const CHATFLOW_ID = process.env.CHATFLOW_ID;
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY;
const PORT = process.env.WHATSAPP_PORT || 3002;

const WAZZUP_API_URL = 'https://api.wazzup24.com/v3/message';

const app = express();

app.use(express.json());

const userLastMessage = new Map();
const conversationHistory = new Map();
const RATE_LIMIT_MS = 3000;
const MAX_HISTORY_TURNS = 20;

function sanitizeText(text) {
  if (!text) return text;
  return Buffer.from(text, 'utf8').toString('utf8');
}

function logFlowiseRequest(chatId, question, history) {
  const turnCount = Math.floor(history.length / 2);
  console.log(
    `[WhatsApp] Flowise request chatId=${chatId} historyTurns=${turnCount} questionLength=${question.length}`
  );
}

function logFlowiseResponse(chatId, answer) {
  console.log(
    `[WhatsApp] Flowise response chatId=${chatId} replyLength=${answer.length}`
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
    `[WhatsApp] Stored history chatId=${chatId} messages=${trimmed.length}`
  );
}

async function sendWhatsAppMessage(chatId, text) {
  try {
    const response = await axios.post(
      WAZZUP_API_URL,
      {
        channelId: WAZZUP_CHANNEL_ID,
        chatType: 'whatsapp',
        chatId: chatId,
        text: text,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WAZZUP_API_KEY}`,
        },
      }
    );

    console.log(`✅ Message sent to ${chatId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

async function getFlowiseResponse(userMessage, sessionId, history) {
  try {
    const response = await axios.post(
      `${FLOWISE_URL}/api/v1/prediction/${CHATFLOW_ID}`,
      {
        question: userMessage,
        history,
        overrideConfig: {
          sessionId: sessionId,
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

    return (
      response.data.text ||
      response.data.answer ||
      'Извините, не могу ответить.'
    );
  } catch (error) {
    console.error('❌ Flowise API error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

app.post('/webhook', async (req, res) => {
  if (req.body.test === true) {
    return res.status(200).json({ status: 'ok' });
  }

  try {
    const messages = req.body.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(200).json({ status: 'ok' });
    }

    for (const message of messages) {
      if (message.isEcho === true) {
        continue;
      }

      const chatId = message.chatId;
      const userMessage = message.text;

      if (!userMessage || !chatId) {
        continue;
      }

      const now = Date.now();
      const lastMessageTime = userLastMessage.get(chatId) || 0;

      if (now - lastMessageTime < RATE_LIMIT_MS) {
        continue;
      }

      userLastMessage.set(chatId, now);

      try {
        const sanitizedMessage = sanitizeText(userMessage);
        const history = getHistory(chatId);
        logFlowiseRequest(chatId, sanitizedMessage, history);
        const aiResponse = await getFlowiseResponse(
          sanitizedMessage,
          `whatsapp_${chatId}`,
          history
        );

        saveTurn(chatId, sanitizedMessage, aiResponse);
        logFlowiseResponse(chatId, aiResponse);
        await sendWhatsAppMessage(chatId, aiResponse);
        console.log(`✅ Message sent to ${chatId}`);
      } catch (error) {
        console.error('❌ Error processing message:', error.message);
        await sendWhatsAppMessage(
          chatId,
          '😔 Извините, произошла ошибка. Попробуйте позже или свяжитесь с нами напрямую.'
        );
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'whatsapp-bot' });
});

app.listen(PORT, () => {
  console.log(`✅ WhatsApp bot server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
