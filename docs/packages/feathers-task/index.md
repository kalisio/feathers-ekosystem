---
title: feathers-task
description: Task execution service for FeathersJS based on BullMQ
---

# feathers-task

**feathers-task** provides background task execution in a **FeathersJS** application, backed by [BullMQ](https://docs.bullmq.io/) and Redis.

It exposes a standard Feathers service to submit, query and remove tasks, while delegating persistence to any Feathers-compatible adapter of your choice (memory, MongoDB, etc.).

## Principle

Tasks are submitted to a **BullMQ queue** stored in Redis. A **worker** picks them up and dispatches them to the appropriate handler based on the job type. Job lifecycle events (active, completed, failed, progress) are reflected back to the persistence service via **QueueEvents**, so task history remains queryable through the Feathers service API.

```
app.service('tasks').create()
        │
        ▼
   BullMQ Queue (Redis)
        │
        ▼
   Worker → handler(job)
        │
        ▼
   QueueEvents → persistence service (patch status)
```

## Installation

Install with your preferred package manager:

```shell
pnpm add @kalisio/feathers-task
```

```shell
npm install @kalisio/feathers-task
```

```shell
yarn add @kalisio/feathers-task
```

`feathers-task` requires **Redis** as infrastructure dependency. BullMQ manages the Redis connection internally — no separate Redis client is needed in your app.

## Configuration

```js
import { feathersTasks } from '@kalisio/feathers-task'
import { MemoryService } from '@feathersjs/memory'

// 1. Register the persistence backend (any Feathers adapter)
app.use('task-store', new MemoryService())

// 2. Configure feathers-task
app.configure(feathersTasks({
  // Feathers service used to persist task history (required)
  persistenceService: 'task-store',
  // Redis connection options passed to BullMQ (required)
  redis: { host: 'localhost', port: 6379 },
  // Queue options
  queue: {
    name: 'tasks',      // BullMQ queue name (default: 'tasks')
    concurrency: 5      // parallel jobs (default: 1)
  },
  // Handlers indexed by job type
  handlers: {
    'send-email': async (job) => { /* ... */ },
    'generate-report': async (job) => { /* ... */ }
  },
  // Optional Bull Board dashboard
  dashboard: {
    enabled: true,
    basePath: '/admin/tasks'
  }
}))
```

The `tasks` service is then available on the app:

```js
app.service('tasks')
```

## Usage

### Submit a task

```js
const task = await app.service('tasks').create({
  type: 'send-email',
  payload: { to: 'user@example.com', subject: 'Hello' },
  // Any BullMQ JobsOptions can be passed here
  options: { delay: 5000, attempts: 3 }
})
// task.id  — BullMQ job id
// task.status — 'waiting'
```

### Query tasks

```js
// All tasks
const tasks = await app.service('tasks').find({})

// With a filter (depends on the persistence adapter)
const failed = await app.service('tasks').find({ query: { status: 'failed' } })
```

### Get a single task

```js
const task = await app.service('tasks').get(jobId)
```

### Remove / cancel a task

```js
await app.service('tasks').remove(jobId)
```

This removes the job from the BullMQ queue (if still pending) **and** from the persistence service.

## Task lifecycle

| Status | Description |
|--------|-------------|
| `waiting` | Job submitted to the queue, not yet picked up |
| `active` | Worker is currently processing the job |
| `completed` | Handler resolved successfully |
| `failed` | Handler threw an error (or max attempts reached) |

Status transitions are written automatically to the persistence service by the internal `QueueEvents` listener.

Handlers can also report incremental progress:

```js
handlers: {
  'generate-report': async (job) => {
    await job.updateProgress(50)
    // ...
    await job.updateProgress(100)
  }
}
```

Progress updates are stored in the persistence record under the `progress` field.

## Dashboard

When `dashboard.enabled` is `true`, **Bull Board** is mounted as an Express middleware at `dashboard.basePath`. It provides a web UI to inspect queues, retry failed jobs and monitor workers.

```js
app.configure(feathersTasks({
  // ...
  dashboard: {
    enabled: true,
    basePath: '/admin/tasks'
  }
}))
```

Navigate to `http://localhost:3030/admin/tasks` to access the dashboard.

> [!NOTE]
> The dashboard requires `@feathersjs/express` — it mounts directly on the underlying Express app.
