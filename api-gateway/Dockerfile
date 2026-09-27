FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
