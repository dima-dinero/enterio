const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.post('/webhook/contacts', async (req, res) => {
  try {
    const { name, phone, summary } = req.body;

    if (!name || !phone) {
      console.error('Missing required fields: name or phone');
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
    };

    const workerUrl = process.env.CLOUDFLARE_WORKER_URL;

    if (!workerUrl) {
      throw new Error('CLOUDFLARE_WORKER_URL is not configured');
    }

    const workerResponse = await axios.post(workerUrl, workerData, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('Lead created:', workerResponse.data?.bitrix?.result);

    res.json({
      success: true,
      message: 'Contact processed successfully',
      data: {
        name,
        phone,
        workerResponse: workerResponse.data,
      },
    });
  } catch (error) {
    console.error('Request processing error:', error.message);

    if (error.response) {
      console.error('Worker response:', error.response.data);
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
