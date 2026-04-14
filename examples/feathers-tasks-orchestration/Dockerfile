FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.1.0 --activate

# Copy workspace manifests needed to resolve the catalog + workspace:* deps
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# Copy the package sources that are referenced as workspace:*
COPY packages/feathers-tasks/package.json ./packages/feathers-tasks/
COPY packages/feathers-tasks/src ./packages/feathers-tasks/src/

# Copy the example manifest
COPY examples/feathers-tasks-orchestration/package.json ./examples/feathers-tasks-orchestration/

# Install only the example's dependencies (no dev, no other workspaces)
RUN pnpm install --filter feathers-tasks-orchestration-example --prod --ignore-scripts

# Copy worker source
COPY examples/feathers-tasks-orchestration/worker ./examples/feathers-tasks-orchestration/worker

WORKDIR /app/examples/feathers-tasks-orchestration

ENV NODE_ENV=production

CMD ["node", "--conditions", "development", "worker/index.js"]
