FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server/package.json server/package-lock.json server/
RUN npm --prefix server ci

COPY . .
RUN npm run build

EXPOSE 8080

CMD ["npm", "--prefix", "server", "start"]
