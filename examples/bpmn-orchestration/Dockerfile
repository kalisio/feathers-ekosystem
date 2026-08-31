FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

COPY packages/feathers-tasks/package.json ./packages/feathers-tasks/
COPY packages/feathers-tasks/src ./packages/feathers-tasks/src/

COPY examples/bpmn-orchestration/package.json ./examples/bpmn-orchestration/

RUN pnpm install --filter bpmn-orchestration --prod --ignore-scripts

COPY examples/bpmn-orchestration/worker ./examples/bpmn-orchestration/worker

WORKDIR /app/examples/bpmn-orchestration

ENV NODE_ENV=production

CMD ["node", "worker/run-job.js"]
