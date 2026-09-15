FROM node:22.13-slim AS tools
WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/mcp-tools/package.json ./packages/mcp-tools/package.json
RUN cd packages/mcp-tools && npm install

COPY packages/mcp-tools ./packages/mcp-tools
RUN cd packages/mcp-tools && npm run build && npm run package

FROM node:22.13-slim AS builder
WORKDIR /app

COPY tsconfig.base.json ./
COPY packages/mcp-server/package.json ./packages/mcp-server/package.json
COPY --from=tools /app/packages/mcp-tools/contentful-mcp-tools-0.4.2.tgz ./packages/mcp-server/contentful-mcp-tools-0.4.2.tgz
RUN cd packages/mcp-server && npm install

COPY packages/mcp-server ./packages/mcp-server
RUN cd packages/mcp-server && npm run build

FROM valkama.saunalahti.fi/image/node:24-alpine AS runtime
WORKDIR /
COPY --from=builder /app/packages/mcp-server/dist ./dist
COPY --from=builder /app/packages/mcp-server/node_modules ./node_modules
EXPOSE 3030
CMD ["node", "dist/bin.js"]

