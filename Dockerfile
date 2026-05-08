# Use a Python image with uv pre-installed
FROM node:22.13-slim

# Install the project into `/app`
WORKDIR /app

COPY packages/mcp-server/package.json .
COPY packages/mcp-tools/contentful-mcp-tools-0.4.2.tgz .
RUN npm install
COPY packages/mcp-server/ .
RUN npm run build
EXPOSE 3030
CMD [ "npm", "run", "start:http" ]

