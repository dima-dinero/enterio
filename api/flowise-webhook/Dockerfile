FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

COPY api/flowise-webhook/ ./flowise-webhook/

RUN npm install --production

EXPOSE 3001

CMD ["node", "flowise-webhook/server.js"]
