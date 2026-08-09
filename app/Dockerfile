FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

# Run as non-root — small but real hardening detail worth mentioning on camera
USER node

CMD ["node", "server.js"]
