async function sendContacts(contacts) {
  try {
    console.log('📤 Отправка контактов в webhook:', contacts);

    const webhookUrl = 'http://flowise-webhook:3001/webhook/contacts';

    let contactData = contacts;
    if (typeof contacts === 'string') {
      try {
        contactData = JSON.parse(contacts);
      } catch (e) {
        console.error('❌ Ошибка парсинга контактов:', e);
        return {
          success: false,
          error: 'Неверный формат данных контактов',
        };
      }
    }

    const name = contactData.name || contactData.Name || '';
    const phone = contactData.phone || contactData.Phone || '';

    if (!name || !phone) {
      console.error('❌ Отсутствуют обязательные поля name или phone');
      return {
        success: false,
        error: 'Не найдены имя или телефон в контактах',
      };
    }

    const payload = {
      name: name.trim(),
      phone: phone.toString().trim(),
    };

    console.log('📦 Payload для отправки:', payload);

    const axios = require('axios');

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const result = response.data;

    console.log('✅ Контакты успешно отправлены:', result);

    return {
      success: true,
      message: 'Контакты успешно переданы в обработку',
      data: result,
    };
  } catch (error) {
    console.error('❌ Критическая ошибка при отправке контактов:', error);
    return {
      success: false,
      error: error.message || 'Неизвестная ошибка',
    };
  }
}

return await sendContacts($contacts);
