async function sendContacts(contacts, summary) {
  try {
    const webhookUrl = 'http://flowise-webhook:3001/webhook/contacts';

    let contactData = contacts;
    if (typeof contacts === 'string') {
      try {
        contactData = JSON.parse(contacts);
      } catch (e) {
        console.error('Contact parsing error:', e);
        return {
          success: false,
          error: 'Invalid contact data format',
        };
      }
    }

    const name = contactData.name || contactData.Name || '';
    const phone = contactData.phone || contactData.Phone || '';

    if (!name || !phone) {
      console.error('Missing required fields: name or phone');
      return {
        success: false,
        error: 'Name or phone not found in contacts',
      };
    }

    const payload = {
      name: name.trim(),
      phone: phone.toString().trim(),
      summary: summary || 'No conversation data',
    };

    const axios = require('axios');

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const result = response.data;

    return {
      success: true,
      message: 'Contacts successfully processed',
      data: result,
    };
  } catch (error) {
    console.error('Critical error sending contacts:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

return await sendContacts($contacts, $summary);
