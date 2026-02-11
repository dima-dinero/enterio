const FORM_TYPES = {
  'ai chat': {
    title: 'Новая заявка с бота Enterio AI',
  },
  callback: {
    title: 'Заявка на обратный звонок',
  },
  appointment: {
    title: 'Заявка на просмотр объектов',
  },
  design: {
    title: 'Новая заявка на дизайн - проект',
  },
  renovation: {
    title: 'Новая заявка на ремонт',
  },
  furnishing: {
    title: 'Новая заявка на комплектацию',
  },
  supervision: {
    title: 'Новая заявка на авторское сопровождение',
  },
  partnership: {
    title: 'Новая заявка на партнерство',
  },
  catalog: {
    title: 'Заявка на скачивание каталога',
  },
};

const DEFAULT_FORM_CONFIG = {
  title: (formName) => `Новая заявка с сайта ${formName}`,
};

const trim = (v) => (v ? v.toString().trim() : '');
const onlyDigitsPlus = (s) => trim(s).replace(/[^+\d]/g, '');

const isBlockedPhone = (phone) => {
  if (!phone) return false;
  const normalized = onlyDigitsPlus(phone);
  return normalized.startsWith('+7927') || normalized.startsWith('8927');
};

const parseRequestData = async (request) => {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return await request.json();
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  throw new Error('Unsupported Content-Type');
};

const extractFormData = (rawData) => {
  const wfData =
    rawData?.payload?.data && typeof rawData.payload.data === 'object'
      ? rawData.payload.data
      : rawData;

  return {
    name: trim(wfData.name),
    phone: onlyDigitsPlus(wfData.phone),
    comment: trim(wfData.comment),
    date: trim(wfData.date),
    time: trim(wfData.time),
    formName: trim(wfData.form_name),
    companyName: trim(wfData.company_name),
    activity: trim(wfData.activity),
    ymClientId: trim(wfData.ym_client_id),
    source: trim(wfData.source) || 'Веб-сайт',

    utmSource: trim(wfData.utm_source),
    utmMedium: trim(wfData.utm_medium),
    utmCampaign: trim(wfData.utm_campaign),
    utmTerm: trim(wfData.utm_term),
    utmContent: trim(wfData.utm_content),

    turnstileToken: trim(
      wfData.turnstile_token || wfData['cf-turnstile-response']
    ),
  };
};

const getFormConfig = (formName) => {
  const config = FORM_TYPES[formName.toLowerCase()];
  if (config) return config;

  return {
    title: DEFAULT_FORM_CONFIG.title(formName),
  };
};

const getSourceMapping = (source) => {
  const sourceMap = {
    WhatsApp: { SOURCE_ID: 'UC_8I4SRC', SOURCE_DESCRIPTION: 'WhatsApp' },
    Telegram: { SOURCE_ID: 'UC_I4W10P', SOURCE_DESCRIPTION: 'Telegram' },
    'AI Chat': { SOURCE_ID: 'UC_AI_CHAT', SOURCE_DESCRIPTION: 'AI Chat' },
    'Веб-сайт': { SOURCE_ID: 'WEB', SOURCE_DESCRIPTION: 'Веб-сайт' },
  };

  return (
    sourceMap[source] || {
      SOURCE_ID: 'WEB',
      SOURCE_DESCRIPTION: source || 'Веб-сайт',
    }
  );
};

const buildComments = (data) => {
  const {
    comment,
    companyName,
    activity,
    date,
    time,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
  } = data;

  const parts = [];

  if (comment) {
    parts.push(comment);
  }

  if (companyName) parts.push(`Компания: ${companyName}`);
  if (activity) parts.push(`Сфера деятельности: ${activity}`);
  if (date) parts.push(`Дата для связи: ${date}`);
  if (time) parts.push(`Время для связи: ${time}`);

  const utmLines = [];
  if (utmSource) utmLines.push(`utm_source: ${utmSource}`);
  if (utmMedium) utmLines.push(`utm_medium: ${utmMedium}`);
  if (utmCampaign) utmLines.push(`utm_campaign: ${utmCampaign}`);
  if (utmTerm) utmLines.push(`utm_term: ${utmTerm}`);
  if (utmContent) utmLines.push(`utm_content: ${utmContent}`);

  if (utmLines.length) {
    parts.push('');
    parts.push('UTM-метки:');
    parts.push(utmLines.join('\n'));
  }

  return parts.join('\n');
};

const parseDateTimeForActivity = (date, time) => {
  const dateMatch = date.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!dateMatch) return null;

  const dateISO = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  const timeMatch = time.match(/(\d{1,2}:\d{2})(?:-(\d{1,2}:\d{2}))?/);
  if (!timeMatch) return null;

  const startTime = timeMatch[1];
  const endTime = timeMatch[2] || startTime;

  return {
    start: `${dateISO}T${startTime}:00`,
    end: `${dateISO}T${endTime}:00`,
  };
};

const updateLeadTicketId = async (base, leadId) => {
  const payload = {
    id: leadId,
    fields: {
      UF_CRM_1651562833: leadId,
    },
  };

  const response = await fetch(`${base}/crm.lead.update.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    console.error('[Bitrix] Lead ticket ID update failed:', {
      status: response.status,
      result,
    });
  }
};

const createBitrixLead = async (base, data, formConfig, comments) => {
  const { name, phone, ymClientId, source } = data;
  const { title } = formConfig;

  const sourceMapping = getSourceMapping(source);

  const payload = {
    fields: {
      TITLE: title,
      NAME: name || undefined,
      PHONE: phone ? [{ VALUE: phone, TYPE: 'WORK' }] : [],
      COMMENTS: comments.trim() || undefined,
      SOURCE_ID: sourceMapping.SOURCE_ID,
      SOURCE_DESCRIPTION: sourceMapping.SOURCE_DESCRIPTION,
      UF_CRM_1760696365: ymClientId || undefined,
    },
    params: { REGISTER_SONET_EVENT: 'Y' },
  };

  const response = await fetch(`${base}/crm.lead.add.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('[Bitrix] Lead creation failed:', {
      status: response.status,
      result,
    });
  }

  if (response.ok && result?.result) {
    const leadId = result.result;
    await updateLeadTicketId(base, leadId);
  }

  return { response, result };
};

const addTimelineComment = async (base, leadId, comments) => {
  if (!comments) return;

  const payload = {
    fields: {
      ENTITY_ID: leadId,
      ENTITY_TYPE: 'lead',
      COMMENT: comments,
    },
  };

  const response = await fetch(`${base}/crm.timeline.comment.add.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    console.error('[Bitrix] Timeline comment failed:', {
      status: response.status,
      result,
    });
  }
};

const createActivity = async (base, leadId, data) => {
  const { date, time, phone } = data;
  if (!date || !time) return;

  const dateTime = parseDateTimeForActivity(date, time);
  if (!dateTime) return;

  const payload = {
    fields: {
      OWNER_ID: leadId,
      OWNER_TYPE_ID: 1,
      TYPE_ID: 2,
      SUBJECT: 'Связаться с клиентом',
      DESCRIPTION: 'Автоматически создано из формы сайта',
      START_TIME: dateTime.start,
      END_TIME: dateTime.end,
      COMPLETED: 'N',
      NOTIFY_TYPE: 2,
      NOTIFY_VALUE: 15,
      COMMUNICATIONS: phone
        ? [{ VALUE: phone, TYPE: 'PHONE' }]
        : [{ VALUE: 'info@enterio.ru', TYPE: 'EMAIL' }],
    },
  };

  const response = await fetch(`${base}/crm.activity.add.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    console.error('[Bitrix] Activity creation failed:', {
      status: response.status,
      result,
    });
  }
};

const sendUnisenderEmail = async (apiKey, data, title) => {
  try {
    const { name, phone, companyName, activity, comment, date, time, source } =
      data;

    const listsResp = await fetch(
      'https://api.unisender.com/ru/api/getLists?format=json',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ api_key: apiKey }),
      }
    );

    const listsData = await listsResp.json().catch(() => null);
    const listId = Array.isArray(listsData?.result) && listsData.result[0]?.id;

    if (!listId) {
      console.warn('[Unisender] No list found');
      return;
    }

    const emailBody = `
      <strong>${title}</strong><br/><br/>
      👤 <b>Имя:</b> ${name || '—'}<br/>
      📞 <b>Телефон:</b> ${phone || '—'}<br/>
      ${source ? `🌐 <b>Источник:</b> ${source}<br/>` : ''}
      ${companyName ? `🏢 <b>Компания:</b> ${companyName}<br/>` : ''}
      ${activity ? `💼 <b>Сфера деятельности:</b> ${activity}<br/>` : ''}
      ${comment ? `💬 <b>Комментарий:</b> ${comment}<br/>` : ''}
      ${date ? `📅 <b>Дата для связи:</b> ${date}<br/>` : ''}
      ${time ? `⏰ <b>Время для связи:</b> ${time}<br/>` : ''}
    `;

    await fetch('https://api.unisender.com/ru/api/sendEmail?format=json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        api_key: apiKey,
        email: `Enterio <zayavki@enterio.ru>`,
        sender_name: 'Enterio',
        sender_email: 'info@enterio.ru',
        subject: title,
        body: emailBody,
        list_id: listId,
        lang: 'ru',
        error_checking: '1',
      }),
    });

    console.log('[Unisender] Email sent successfully');
  } catch (error) {
    console.error('[Unisender] Error:', error.message);
  }
};

const sendTelegramNotification = async (token, chatId, data, title) => {
  try {
    const { name, phone, companyName, activity, comment, date, time, source } =
      data;

    const message = [
      `📬 <b>${title}</b>`,
      '\u00A0',
      `👤 <b>Имя:</b> ${name || '—'}`,
      `📞 <b>Телефон:</b> ${phone || '—'}`,
      source ? `🌐 <b>Источник:</b> ${source}` : null,
      companyName ? `🏢 <b>Компания:</b> ${companyName}` : null,
      activity ? `💼 <b>Сфера деятельности:</b> ${activity}` : null,
      '\u00A0',
      comment ? `💬 <b>Комментарий:</b> ${comment}` : null,
      date ? `📅 <b>Дата для связи:</b> ${date}` : null,
      time ? `⏰ <b>Время для связи:</b> ${time}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    console.log('[Telegram] Notification sent successfully');
  } catch (error) {
    console.error('[Telegram] Error:', error.message);
  }
};

const validateRequest = (request, env) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const expected = env.HOOK_SECRET;
  const okRoute = parts.length >= 2 && parts[parts.length - 2] === 'hook';
  const lastSeg = parts[parts.length - 1];

  if (!okRoute || !expected || lastSeg !== expected) {
    return new Response('Forbidden', { status: 403 });
  }

  return null;
};

const checkRateLimit = async (request, env) => {
  if (!env.RATE_LIMIT_KV) {
    return { allowed: true };
  }

  const clientIp = request.headers.get('CF-Connecting-IP');

  if (!clientIp) {
    console.warn('[Rate Limit] Could not get client IP');
    return { allowed: true };
  }

  const kvKey = `rate_limit_${clientIp}`;

  try {
    const lastSubmitTime = await env.RATE_LIMIT_KV.get(kvKey);

    if (lastSubmitTime) {
      const lastSubmitTimestamp = parseInt(lastSubmitTime, 10);
      const currentTime = Date.now();
      const timePassed = currentTime - lastSubmitTimestamp;
      const oneHour = 60 * 60 * 1000;

      if (timePassed < oneHour) {
        const minutesLeft = Math.ceil((oneHour - timePassed) / 60000);

        return {
          allowed: false,
          minutesLeft: minutesLeft,
          message: `Вы уже отправляли заявку недавно. Можно отправлять не более 1 заявки в час. Попробуйте через ${minutesLeft} мин.`,
        };
      }
    }

    const currentTime = Date.now().toString();

    await env.RATE_LIMIT_KV.put(kvKey, currentTime, {
      expirationTtl: 7200,
    });

    return { allowed: true };
  } catch (error) {
    console.error('[Rate Limit] Error:', error.message);
    return { allowed: true };
  }
};

const verifyTurnstileToken = async (token, secretKey, remoteIp) => {
  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      }
    );

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('[Turnstile] Verification error:', error.message);
    return false;
  }
};

export default {
  async fetch(request, env) {
    const validationError = validateRequest(request, env);
    if (validationError) return validationError;

    try {
      const rawData = await parseRequestData(request);
      const data = extractFormData(rawData);

      if (isBlockedPhone(data.phone)) {
        console.warn('[Phone Block] Blocked phone number:', data.phone);
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Этот номер телефона заблокирован',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const isAiBot = data.formName.toLowerCase() === 'ai chat';

      if (!isAiBot) {
        if (env.TURNSTILE_SECRET_KEY) {
          if (!data.turnstileToken) {
            console.error('[Turnstile] Token missing in request');
            return new Response('Turnstile verification required', {
              status: 403,
            });
          }

          const clientIp = request.headers.get('CF-Connecting-IP');
          const isValid = await verifyTurnstileToken(
            data.turnstileToken,
            env.TURNSTILE_SECRET_KEY,
            clientIp
          );

          if (!isValid) {
            console.error('[Turnstile] Token verification failed');
            return new Response('Turnstile verification failed', {
              status: 403,
            });
          }

          console.log('[Turnstile] Verification successful');
        }

        const rateLimitCheck = await checkRateLimit(request, env);

        if (!rateLimitCheck.allowed) {
          const clientIp = request.headers.get('CF-Connecting-IP');
          console.warn(
            `[Rate Limit] Request blocked - IP: ${clientIp}, Minutes left: ${rateLimitCheck.minutesLeft}`
          );
          return new Response(
            JSON.stringify({
              ok: true,
              message: rateLimitCheck.message,
              rateLimited: true,
              minutesLeft: rateLimitCheck.minutesLeft,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      const formConfig = getFormConfig(data.formName);
      const comments = buildComments(data);

      const bitrixBase = (env.BITRIX_BASE || '').replace(/\/+$/, '');
      if (!bitrixBase) {
        return new Response('BITRIX_BASE is not set', { status: 500 });
      }

      const { response: bitrixResp, result: bitrixResult } =
        await createBitrixLead(bitrixBase, data, formConfig, comments);

      if (bitrixResp.ok && bitrixResult?.result) {
        const leadId = bitrixResult.result;

        await Promise.all([
          addTimelineComment(bitrixBase, leadId, comments),
          createActivity(bitrixBase, leadId, data),
        ]);
      }

      const notifications = [];

      if (env.UNISENDER_API_KEY) {
        notifications.push(
          sendUnisenderEmail(env.UNISENDER_API_KEY, data, formConfig.title)
        );
      }

      if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
        notifications.push(
          sendTelegramNotification(
            env.TELEGRAM_BOT_TOKEN,
            env.TELEGRAM_CHAT_ID,
            data,
            formConfig.title
          )
        );
      }

      await Promise.allSettled(notifications);

      return new Response(
        JSON.stringify({
          ok: bitrixResp.ok,
          bitrix: bitrixResult,
        }),
        {
          status: bitrixResp.ok ? 200 : 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (e) {
      console.error('[Worker] Error:', e?.message, e?.stack);
      return new Response(`Error: ${e?.message || e}`, { status: 500 });
    }
  },
};
