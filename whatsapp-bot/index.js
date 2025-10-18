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
const RATE_LIMIT_MS = 3000;

function sanitizeText(text) {
  if (!text) return text;
  return Buffer.from(text, 'utf8').toString('utf8');
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

async function getFlowiseResponse(userMessage, sessionId) {
  try {
    const sanitizedMessage = sanitizeText(userMessage);

    const response = await axios.post(
      `${FLOWISE_URL}/api/v1/prediction/${CHATFLOW_ID}`,
      {
        question: sanitizedMessage,
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
    throw error;
  }
}

app.post('/webhook', async (req, res) => {
  console.log('📩 Webhook received:', JSON.stringify(req.body, null, 2));

  if (req.body.test === true) {
    console.log('✅ Test webhook received');
    return res.status(200).json({ status: 'ok' });
  }

  try {
    const messages = req.body.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log('⚠️ No messages in webhook');
      return res.status(200).json({ status: 'ok' });
    }

    for (const message of messages) {
      // Wazzup24 помечает исходящие сообщения (от бота) как isEcho: true
      if (message.isEcho === true) {
        console.log('⏭️ Skipping echo message (sent by bot)');
        continue;
      }

      const chatId = message.chatId;
      const userMessage = message.text;

      if (!userMessage || !chatId) {
        console.log('⚠️ Message has no text or chatId');
        continue;
      }

      console.log(`📨 Incoming message from ${chatId}: ${userMessage}`);

      const now = Date.now();
      const lastMessageTime = userLastMessage.get(chatId) || 0;

      if (now - lastMessageTime < RATE_LIMIT_MS) {
        console.log(`⏸️ Rate limit for ${chatId}, skipping`);
        continue;
      }

      userLastMessage.set(chatId, now);

      try {
        const aiResponse = await getFlowiseResponse(
          userMessage,
          `whatsapp_${chatId}`
        );
        console.log(`🤖 AI response: ${aiResponse}`);

        await sendWhatsAppMessage(chatId, aiResponse);
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
  console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`🔗 Channel ID: ${WAZZUP_CHANNEL_ID}`);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
