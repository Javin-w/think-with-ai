# ============ Stage 1: 构建前端 ============
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 先复制依赖声明，利用 Docker 层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/types/package.json packages/types/

RUN pnpm install --frozen-lockfile

# 复制源码并构建前端
COPY tsconfig.base.json ./
COPY packages/types/ packages/types/
COPY apps/client/ apps/client/

RUN pnpm --filter client build

# ============ Stage 2: 后端运行时 ============
FROM node:22-slim AS server

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/types/package.json packages/types/

# tsx 在 devDeps 中，必须安装全部依赖
RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/types/ packages/types/
COPY apps/server/ apps/server/

EXPOSE 3000

CMD ["pnpm", "--filter", "server", "exec", "tsx", "src/index.ts"]
