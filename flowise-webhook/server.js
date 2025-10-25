const express = require('express');
const axios = require('axios');
require('dotenv').config();

if (!process.env.CLOUDFLARE_WORKER_URL) {
  console.error(
    '❌ Error: CLOUDFLARE_WORKER_URL not found in environment variables'
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;
const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;

const requestTimestamps = new Map();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 10;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.post('/webhook/contacts', async (req, res) => {
  try {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const timestamps = requestTimestamps.get(clientId) || [];
    const recentRequests = timestamps.filter(
      (t) => now - t < RATE_LIMIT_WINDOW
    );

    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      console.warn(`Rate limit exceeded for ${clientId}`);
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    recentRequests.push(now);
    requestTimestamps.set(clientId, recentRequests);

    const { name, phone, summary, source } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Fields name and phone are required',
      });
    }

    const workerData = {
      name: name.trim(),
      phone: phone.toString().trim(),
      form_name: 'AI Chat',
      comment: summary || 'Request from AI chat assistant',
      source: source || 'Веб-сайт',
    };

    const workerResponse = await axios.post(CLOUDFLARE_WORKER_URL, workerData, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log(`✅ Contact processed: ${name} - ${phone}`);

    res.json({
      success: true,
      message: 'Contact processed successfully',
    });
  } catch (error) {
    console.error('❌ Error processing contact:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }

    res.status(500).json({
      success: false,
      error: 'Error processing contact',
      details: error.message,
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'flowise-webhook',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Flowise webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/contacts`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
