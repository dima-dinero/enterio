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

async function sendContacts(contacts, summary) {
  try {
    const webhookUrl = 'http://flowise-webhook:3001/webhook/contacts';

    let contactData = contacts;
    if (typeof contacts === 'string') {
      try {
        contactData = JSON.parse(contacts);
      } catch (e) {
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

    const payload = {
      name: name.trim(),
      phone: phoneValidation.formatted,
      summary: summary || 'No conversation data',
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
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

await sendContacts($contacts, $summary);
