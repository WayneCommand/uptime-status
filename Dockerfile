FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY worker/package*.json worker/
RUN cd worker && npm ci

COPY tsconfig.json next.config.js postcss.config.js ./
COPY .eslintrc.json ./
COPY public/ public/
COPY styles/ styles/
COPY types/ types/
COPY util/ util/
COPY components/ components/
COPY pages/ pages/
COPY locales/ locales/
COPY uptime.config.ts uptime.config.full.ts ./
COPY env.d.ts middleware.ts ./
COPY init.sql ./

RUN npx @cloudflare/next-on-pages

FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dcron python3 py3-pip

COPY --from=builder /app/.vercel/output/static ./static
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/init.sql ./

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 8787 8788

ENTRYPOINT ["/app/entrypoint.sh"]
