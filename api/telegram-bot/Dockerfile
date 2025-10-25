FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

COPY api/telegram-bot/ ./telegram-bot/

RUN npm install --production

CMD ["node", "telegram-bot/index.js"]
