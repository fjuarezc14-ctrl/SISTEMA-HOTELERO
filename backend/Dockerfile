FROM node:20-alpine

WORKDIR /app

# Hora local del hotel (Perú): cálculos como "salida a las 12:00" usan esta zona
ENV TZ=America/Lima

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 4020

CMD ["node", "src/server.js"]
