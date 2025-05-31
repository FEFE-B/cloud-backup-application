# Backend
FROM node:16-alpine as backend

WORKDIR /app/backend

COPY backend/package*.json ./

RUN npm install

COPY backend ./

# Frontend
FROM node:16-alpine as frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm install

COPY frontend ./

RUN npm run build

# Final image
FROM node:16-alpine

WORKDIR /app

COPY --from=backend /app/backend ./backend
COPY --from=frontend-build /app/frontend/build ./frontend/build

WORKDIR /app/backend

ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "server.js"]
