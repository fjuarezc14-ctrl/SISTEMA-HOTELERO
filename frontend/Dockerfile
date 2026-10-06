# Etapa 1: Compilación de los archivos estáticos de React con Vite
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx ligero para producción
FROM nginx:alpine

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar bundle estático optimizado desde la etapa de compilación
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 5185

CMD ["nginx", "-g", "daemon off;"]
