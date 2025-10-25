FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

COPY api/whatsapp-bot/ ./whatsapp-bot/

RUN npm install --production

EXPOSE 3002

CMD ["node", "whatsapp-bot/index.js"]
