FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.1.0 --activate

COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

COPY packages/feathers-tasks/package.json ./packages/feathers-tasks/
COPY packages/feathers-tasks/src ./packages/feathers-tasks/src/

COPY examples/feathers-bpmn-orchestration/package.json ./examples/feathers-bpmn-orchestration/

RUN pnpm install --filter feathers-bpmn-orchestration-example --prod --ignore-scripts

COPY examples/feathers-bpmn-orchestration/worker ./examples/feathers-bpmn-orchestration/worker

WORKDIR /app/examples/feathers-bpmn-orchestration

ENV NODE_ENV=production

CMD ["node", "worker/run-job.js"]
