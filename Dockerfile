# Delve: build the Vite app, then serve dist/ with the dependency-free server.js.
# Ruust uses this file instead of Nixpacks when it is present. The app listens on 0.0.0.0:8080.

# ---- build stage ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
# package.json is needed at runtime for "type": "module"; server.js has no dependencies.
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json server.js ./
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
