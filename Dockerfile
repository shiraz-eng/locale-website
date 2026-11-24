FROM node:24-bookworm-slim
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG API_ORIGIN
ARG PUBLIC_ORIGIN=http://localhost:3000
ENV API_ORIGIN=$API_ORIGIN PUBLIC_ORIGIN=$PUBLIC_ORIGIN
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["pnpm","start"]
