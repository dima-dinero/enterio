export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const expected = env.WEBFLOW_HOOK_SECRET;
    const okRoute = parts.length >= 2 && parts[parts.length - 2] === 'hook';
    const lastSeg = parts[parts.length - 1];

    if (!okRoute || !expected || lastSeg !== expected) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      // --- Получаем данные из запроса ---
      let rawData;
      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        rawData = await request.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        rawData = Object.fromEntries(formData.entries());
      } else {
        return new Response('Unsupported Content-Type', { status: 400 });
      }

      const wfData =
        rawData?.payload?.data && typeof rawData.payload.data === 'object'
          ? rawData.payload.data
          : rawData;

      const t = (v) => (v ? v.toString().trim() : '');
      const onlyDigitsPlus = (s) => t(s).replace(/[^+\d]/g, '');

      const name = t(wfData.name);
      const phone = onlyDigitsPlus(wfData.phone);
      const comment = t(wfData.comment);
      const date = t(wfData.date);
      const time = t(wfData.time);
      const formName = t(wfData.form_name) || 'Enterio';
      const companyName = t(wfData.company_name);
      const activity = t(wfData.activity);

      // --- Комментарий ---
      let comments = comment;
      if (companyName) comments += `\nКомпания: ${companyName}`;
      if (activity) comments += `\nСфера деятельности: ${activity}`;
      if (date) comments += `\nДата для связи: ${date}`;
      if (time) comments += `\nВремя для связи: ${time}`;

      // --- Заголовок ---
      let title = `Новая заявка с сайта ${formName}`;
      let assignedId = 464;
      switch (formName.toLowerCase()) {
        case 'callback':
          title = 'Заявка на обратный звонок';
          break;
        case 'appointment':
          title = 'Заявка на просмотр объектов';
          break;
        case 'design':
          title = 'Новая заявка на дизайн - проект';
          break;
        case 'renovation':
          title = 'Новая заявка на ремонт';
          break;
        case 'furnishing':
          title = 'Новая заявка на комплектацию';
          break;
        case 'supervision':
          title = 'Новая заявка на авторское сопровождение';
          break;
        case 'partnership':
          title = 'Новая заявка на партнерство';
          assignedId = 664;
          break;
      }

      // --- Bitrix ---
      const base = (env.BITRIX_BASE || '').replace(/\/+$/, '');
      if (!base) return new Response('BITRIX_BASE is not set', { status: 500 });

      const payload = {
        fields: {
          TITLE: title,
          NAME: name || undefined,
          PHONE: phone ? [{ VALUE: phone, TYPE: 'WORK' }] : [],
          COMMENTS: comments.trim() || undefined,
          SOURCE_ID: 'WEB',
          ASSIGNED_BY_ID: assignedId,
        },
        params: { REGISTER_SONET_EVENT: 'Y' },
      };

      const bitrixResp = await fetch(`${base}/crm.lead.add.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const bitrixResult = await bitrixResp.json().catch(() => ({}));

      // --- Создание дела, если есть дата и время ---
      if (bitrixResp.ok && bitrixResult?.result && date && time) {
        const leadId = bitrixResult.result;

        const dateMatch = date.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        const dateISO = dateMatch
          ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
          : null;

        const timeMatch = time.match(/(\d{1,2}:\d{2})(?:-(\d{1,2}:\d{2}))?/);
        const startTime = timeMatch ? timeMatch[1] : null;
        const endTime = timeMatch?.[2] || startTime;

        if (dateISO && startTime) {
          const start = `${dateISO}T${startTime}:00`;
          const end = `${dateISO}T${endTime}:00`;

          const activityPayload = {
            fields: {
              OWNER_ID: leadId,
              OWNER_TYPE_ID: 1,
              TYPE_ID: 2,
              SUBJECT: 'Связаться с клиентом',
              DESCRIPTION: 'Автоматически создано из формы сайта',
              START_TIME: start,
              END_TIME: end,
              RESPONSIBLE_ID: assignedId,
              COMPLETED: 'N',
              NOTIFY_TYPE: 2,
              NOTIFY_VALUE: 15,
              COMMUNICATIONS: phone
                ? [{ VALUE: phone, TYPE: 'PHONE' }]
                : [{ VALUE: 'info@enterio.ru', TYPE: 'EMAIL' }],
            },
          };

          const activityResp = await fetch(`${base}/crm.activity.add.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activityPayload),
          });

          await activityResp.json().catch(() => ({}));
        }
      }

      // --- Unisender ---
      const listsResp = await fetch(
        'https://api.unisender.com/ru/api/getLists?format=json',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            api_key: env.UNISENDER_API_KEY,
          }),
        }
      );

      const listsData = await listsResp.json().catch(() => null);
      const listId =
        Array.isArray(listsData?.result) && listsData.result[0]?.id;
      if (!listId) {
        return new Response('Не удалось получить list_id из Unisender', {
          status: 500,
        });
      }

      const emailBody = `
        ${title}:<br/>
        <strong>Имя:</strong> ${name}<br/>
        <strong>Телефон:</strong> ${phone}<br/>
        ${companyName ? `<strong>Компания:</strong> ${companyName}<br/>` : ''}
        ${activity ? `<strong>Сфера деятельности:</strong> ${activity}<br/>` : ''}
        <strong>Комментарий:</strong> ${comment}<br/>
        ${date ? `<strong>Дата:</strong> ${date}<br/>` : ''}
        ${time ? `<strong>Время:</strong> ${time}<br/>` : ''}
      `;

      await fetch('https://api.unisender.com/ru/api/sendEmail?format=json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          api_key: env.UNISENDER_API_KEY,
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

      // --- Telegram ---
      const telegramToken = env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = env.TELEGRAM_CHAT_ID;
      if (telegramToken && telegramChatId) {
        const tgMessage = [
          `📬 <b>${title}</b>`,
          `<b>Имя:</b> ${name || '—'}`,
          `<b>Телефон:</b> ${phone || '—'}`,
          companyName ? `<b>Компания:</b> ${companyName}` : null,
          activity ? `<b>Сфера деятельности:</b> ${activity}` : null,
          comment ? `<b>Комментарий:</b> ${comment}` : null,
          date ? `<b>Дата для связи:</b> ${date}` : null,
          time ? `<b>Время для связи:</b> ${time}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        await fetch(
          `https://api.telegram.org/bot${telegramToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: tgMessage,
              parse_mode: 'HTML',
            }),
          }
        );
      }

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
      console.error('Ошибка в воркере:', e);
      return new Response(`Error: ${e?.message || e}`, { status: 500 });
    }
  },
};
