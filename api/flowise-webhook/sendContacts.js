const axios = require('axios');

function validateRussianPhone(phone) {
  const phoneStr = `${phone}`.replace(/\D/g, '');

  const normalizedPhone =
    phoneStr.startsWith('8') && phoneStr.length === 11
      ? '7' + phoneStr.slice(1)
      : phoneStr;

  if (!/^7\d{10}$/.test(normalizedPhone)) {
    return { valid: false, error: 'Invalid Russian phone format' };
  }

  return { valid: true, formatted: `+${normalizedPhone}` };
}

function getSourceFromSessionId(sessionId) {
  if (!sessionId) return 'AI Chat';

  if (sessionId.startsWith('whatsapp_')) return 'WhatsApp';
  if (sessionId.startsWith('telegram_')) return 'Telegram';
  if (sessionId.startsWith('website_')) return 'AI Chat';

  return 'AI Chat';
}

async function sendContacts(contacts, summary) {
  try {
    const webhookUrl = 'http://flowise-webhook:3001/webhook/contacts';

    let contactData = contacts;
    if (typeof contacts === 'string') {
      try {
        contactData = JSON.parse(contacts);
      } catch (e) {
        console.error('JSON parse error:', e.message);
        return {
          success: false,
          error: 'Invalid contact data format',
        };
      }
    }

    const name = contactData.name || contactData.Name || '';
    const phone = contactData.phone || contactData.Phone || '';

    if (!name || !phone) {
      return {
        success: false,
        error: 'Name or phone not found in contacts',
      };
    }

    const phoneValidation = validateRussianPhone(phone);
    if (!phoneValidation.valid) {
      return {
        success: false,
        error: `Invalid phone number: ${phoneValidation.error}`,
      };
    }

    const sessionId = $flow.sessionId || '';
    const source = $vars?.source || getSourceFromSessionId(sessionId);

    const payload = {
      name: name.trim(),
      phone: phoneValidation.formatted,
      summary: summary || 'No conversation data',
      source: source,
      utm_source: $vars?.utm_source || '',
      utm_medium: $vars?.utm_medium || '',
      utm_campaign: $vars?.utm_campaign || '',
      utm_term: $vars?.utm_term || '',
      utm_content: $vars?.utm_content || '',
    };

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    return {
      success: true,
      message: 'Contact successfully sent to processing',
    };
  } catch (error) {
    console.error('Error sending contacts:', error.message);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

const result = await sendContacts($contacts, $summary);
return JSON.stringify(result);
