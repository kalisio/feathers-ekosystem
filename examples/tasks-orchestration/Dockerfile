FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.1.0 --activate

COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

COPY packages/feathers-tasks/package.json ./packages/feathers-tasks/
COPY packages/feathers-tasks/src ./packages/feathers-tasks/src/

COPY examples/tasks-orchestration/package.json ./examples/tasks-orchestration/

RUN pnpm install --filter tasks-orchestration --prod --ignore-scripts

COPY examples/tasks-orchestration/worker ./examples/tasks-orchestration/worker

WORKDIR /app/examples/tasks-orchestration

ENV NODE_ENV=production

CMD ["node", "worker/run-job.js"]
