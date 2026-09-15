# Use a Python image with uv pre-installed
FROM node:22.13-slim AS builder

# Install the project into `/app`
WORKDIR /app

COPY packages/mcp-server/package.json .
COPY packages/mcp-tools/contentful-mcp-tools-0.4.2.tgz .
RUN npm install
COPY packages/mcp-server/ .
RUN npm run build

FROM valkama.saunalahti.fi/image/node:24-alpine AS runtime
WORKDIR /
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3030
CMD ["node", "dist/bin.js"]

