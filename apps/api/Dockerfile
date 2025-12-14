FROM node:18-alpine AS base

WORKDIR /app

FROM base AS dependencies

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN yarn install --immutable

FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules

COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

WORKDIR /app/packages/shared
RUN yarn build

WORKDIR /app/apps/api
RUN yarn build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies /app/package.json ./
COPY --from=dependencies /app/yarn.lock ./
COPY --from=dependencies /app/.yarnrc.yml ./
COPY --from=dependencies /app/.yarn ./.yarn
COPY --from=dependencies /app/apps/api/package.json ./apps/api/
COPY --from=dependencies /app/packages/shared/package.json ./packages/shared/

RUN yarn workspaces focus @monorepo/api --production

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

WORKDIR /app/apps/api

EXPOSE 3000

USER node

CMD ["node", "dist/index.js"]
