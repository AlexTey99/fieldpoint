FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine
# Mock app: a fixed demo secret is baked in so the image boots without any injected
# configuration. Override SESSION_SECRET for anything that is not a demo.
ENV NODE_ENV=production PORT=4100 HOST=0.0.0.0 DB_PATH=/data/fieldpoint.db \
    SESSION_SECRET=fieldpoint-demo-secret-0f3c9a1e7b2d4c6f8a0b1c2d3e4f5a6b7c8d9e0f \
    SEED_DEMO=true
WORKDIR /app
RUN mkdir -p /data && chown node:node /data
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts
USER node
EXPOSE 4100
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:4100/api/health || exit 1
CMD ["node", "src/server.js"]
