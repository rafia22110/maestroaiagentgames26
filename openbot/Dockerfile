# Pier 15 Concierge — AG-UI bot endpoint.
# Build:  docker build -t pier15-concierge ./openbot
# Run:    docker run -p 8787:8787 -e ALLOWED_ORIGIN=https://events.example.org pier15-concierge
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787
COPY package.json ./
COPY kb ./kb
COPY src ./src
COPY scripts ./scripts
COPY web ./web
COPY test ./test
# No dependencies to install: the server is zero-dep on purpose.
RUN node --test test/ >/dev/null && node -e "import('./src/kb.mjs').then(m=>m.kb())"
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:8787/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.mjs"]
