FROM node:18-alpine

WORKDIR /app

COPY licensing-api/package*.json ./
RUN npm install --production

COPY licensing-api/ .
COPY database/init.sql /database/init.sql

EXPOSE 3000

CMD ["node", "src/server.js"]
