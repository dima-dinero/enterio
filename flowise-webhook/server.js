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
    console.log('📩 Получены данные от Flowise:', req.body);

    const { name, phone } = req.body;

    if (!name || !phone) {
      console.error('❌ Ошибка: отсутствуют обязательные поля');
      return res.status(400).json({
        success: false,
        error: 'Поля name и phone обязательны',
      });
    }

    const workerData = {
      name: name.trim(),
      phone: phone.trim(),
      form_name: 'AI Chat',
      comment: 'Заявка из чата с AI-ассистентом Flowise',
    };

    console.log('📤 Отправка данных в Cloudflare Worker...');

    const workerUrl = process.env.CLOUDFLARE_WORKER_URL;

    if (!workerUrl) {
      throw new Error('CLOUDFLARE_WORKER_URL не настроен в .env');
    }

    const workerResponse = await axios.post(workerUrl, workerData, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 секунд
    });

    console.log('✅ Данные успешно отправлены в Worker:', workerResponse.data);

    res.json({
      success: true,
      message: 'Контакты успешно обработаны',
      data: {
        name,
        phone,
        workerResponse: workerResponse.data,
      },
    });
  } catch (error) {
    console.error('❌ Ошибка при обработке запроса:', error.message);

    if (error.response) {
      console.error('Ответ от Worker:', error.response.data);
      console.error('Статус:', error.response.status);
    }

    res.status(500).json({
      success: false,
      error: 'Ошибка при обработке контактов',
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
  console.log(`🚀 Flowise Webhook сервер запущен на порту ${PORT}`);
  console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook/contacts`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});
