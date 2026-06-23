---
title: feathers-tasks
description: Task execution service for FeathersJS based on BullMQ
---

# feathers-tasks

**feathers-tasks** provides background task execution in a **FeathersJS** application, backed by [BullMQ](https://docs.bullmq.io/) and Redis.

It exposes a standard Feathers service to submit, query and remove tasks, while delegating persistence to any Feathers-compatible adapter of your choice (memory, MongoDB, etc.).

Rather than a single all-in-one plugin, `feathers-tasks` ships a small set of **composable building blocks** that you wire together explicitly. This keeps the package unopinionated: you choose the persistence backend, the queue name, the concurrency, the handlers and whether to expose a dashboard.

## Principle

Tasks are submitted to a **BullMQ queue** stored in Redis. A **worker** picks them up and dispatches them to the appropriate handler based on the job type. Job lifecycle events (active, completed, failed, progress) are reflected back to the persistence service via **QueueEvents**, so task history remains queryable through the standard Feathers service API.

```
app.service('tasks').create({ type, payload, options })
        │   TaskService.create() → queue.add(type, payload, options)
        │                        → persistence: { id, type, status: 'waiting' }
        ▼
   BullMQ Queue (Redis)
        │
        ▼
   Worker → handlers[job.name](job)
        │
        │   BullMQ emits: active / progress / completed / failed
        ▼
   QueueEvents → persistence service (patch status)
```

Three logical roles cooperate through Redis. They can all live in the same Node process (as in the examples) or be split across processes/containers:

| Role | Building block | Responsibility |
|------|----------------|----------------|
| Producer | `TaskService` | Adds jobs to the queue, exposes the Feathers API, persists the initial record |
| Consumer | `createWorker` | Picks jobs and runs the handler matching `job.name` (the task `type`) |
| Observer | `setupQueueEvents` | Translates BullMQ events into status patches on the persistence service |

## Installation

Install with your preferred package manager:

::: code-group

```bash [pnpm]
pnpm add @kalisio/feathers-tasks
```

```bash [npm]
npm install @kalisio/feathers-tasks
```

```bash [yarn]
yarn add @kalisio/feathers-tasks
```

:::

> [!WARNING]
> `feathers-tasks` requires **Redis** as an infrastructure dependency. BullMQ manages the Redis connection
> internally — no separate Redis client is needed in your app.

## Exports

The package entry point exports five building blocks plus a re-export of the underlying BullMQ primitives:

| Export | Kind | Purpose |
|--------|------|---------|
| `TaskService` | class | Feathers service to submit / query / remove tasks |
| `createQueue` | function | Creates a BullMQ `Queue` connected to Redis |
| `createWorker` | function | Creates a BullMQ `Worker` dispatching jobs to handlers by type |
| `setupQueueEvents` | function | Mirrors BullMQ job events into the persistence service |
| `setupDashboard` | function | Mounts the [Bull Board](https://github.com/felixmosh/bull-board) UI as Express middleware |
| `Queue`, `QueueEvents`, `Worker` | classes | Re-exported from `bullmq` for advanced use (e.g. job delegation) |

```js
import {
  TaskService,
  createQueue,
  createWorker,
  setupQueueEvents,
  setupDashboard,
  Queue, QueueEvents, Worker // re-exported from bullmq
} from '@kalisio/feathers-tasks'
```

## Configuration

`feathers-tasks` does not register itself via `app.configure(...)`. Instead you assemble the building blocks. A typical setup looks like this:

```js
import { feathers } from '@feathersjs/feathers'
import express from '@feathersjs/express'
import { MemoryService } from '@feathersjs/memory'
import {
  TaskService, createQueue, createWorker, setupQueueEvents, setupDashboard
} from '@kalisio/feathers-tasks'

const redis = { host: 'localhost', port: 6379 }
const queueName = 'tasks'

const app = express(feathers())
app.use(express.json())

// 1. Register the persistence backend (any Feathers adapter: memory, MongoDB, ...)
app.use('task-store', new MemoryService())

// 2. Create the BullMQ queue
const queue = createQueue(queueName, redis)

// 3. Create a worker with handlers indexed by task type (concurrency = 5)
createWorker(queueName, redis, {
  'send-email': async (job) => { /* ... */ },
  'generate-report': async (job) => { /* ... */ }
}, 5)

// 4. Mirror BullMQ job events into the persistence service
setupQueueEvents(queueName, redis, app, 'task-store')

// 5. (Optional) Mount the Bull Board dashboard
setupDashboard(app, queue, '/admin/tasks')

// 6. Register the task service
app.use('tasks', new TaskService({ queue, persistenceService: 'task-store' }))
```

The `tasks` service is then available on the app:

```js
app.service('tasks')
```

> [!TIP]
> The queue, worker and queue-events do not have to run in the same process. You can run the `TaskService` (producer) in your API server and one or more `createWorker(...)` processes elsewhere — they coordinate through Redis using the same `queueName`. This is exactly what the orchestration examples do, spawning one ephemeral worker container/pod per job.

## API reference

### `createQueue(name, redisOptions)`

Creates and returns a BullMQ `Queue` named `name`, connected to Redis.

- `name` *(string)* — queue name; must match the worker and queue-events.
- `redisOptions` *(object)* — connection options passed to BullMQ (`{ host, port, ... }`).

### `createWorker(queueName, redisOptions, handlers?, concurrency?)`

Creates and returns a BullMQ `Worker`.

- `queueName` *(string)* — queue to consume.
- `redisOptions` *(object)* — Redis connection options.
- `handlers` *(object, default `{}`)* — map of `taskType → async (job) => result`. The handler is selected from `job.name` (the `type` used at submission).
- `concurrency` *(number, default `1`)* — number of jobs processed in parallel by this worker.

> [!NOTE]
> If no handler is registered for a job's type, the worker logs a debug message and resolves the job as a **no-op** (it does not throw). Make sure every submitted `type` has a matching handler.

### `setupQueueEvents(queueName, redisOptions, app, persistenceService)`

Subscribes to the queue's lifecycle events and patches the persistence record accordingly. Returns the `QueueEvents` instance.

- `app` *(Feathers app)* — used to resolve the persistence service.
- `persistenceService` *(string)* — name of the Feathers service holding task history.

### `setupDashboard(app, queue, basePath)`

Mounts the Bull Board web UI on the underlying Express app.

- `basePath` *(string)* — URL path where the dashboard is served, e.g. `/admin/tasks`.

> [!NOTE]
> The dashboard requires `@feathersjs/express` — it mounts directly on the underlying Express app via `app.express()`.

### `new TaskService({ queue, persistenceService })`

A Feathers service. Options:

- `queue` — a BullMQ `Queue` (from `createQueue`).
- `persistenceService` *(string)* — name of the Feathers service used to store task history.

Standard Feathers methods: `create`, `find`, `get`, `patch`, `remove` (see [Usage](#usage)).

## Usage

### Submit a task

```js
const task = await app.service('tasks').create({
  type: 'send-email',
  payload: { to: 'user@example.com', subject: 'Hello' },
  // Any BullMQ JobsOptions can be passed here (delay, attempts, backoff, priority, ...)
  options: { delay: 5000, attempts: 3 }
})
// task.id     — BullMQ job id
// task.type   — 'send-email'
// task.status — 'waiting'
```

The `options` object is forwarded verbatim to `queue.add(...)`, so the full set of [BullMQ `JobsOptions`](https://api.docs.bullmq.io/types/v5.JobsOptions.html) is available (retries, delays, repeat, priority, etc.).

### Query tasks

`find` is delegated entirely to the persistence service, so any query the adapter supports works:

```js
// All tasks
const tasks = await app.service('tasks').find({})

// With a filter (depends on the persistence adapter)
const failed = await app.service('tasks').find({ query: { status: 'failed' } })
```

### Get a single task

```js
const task = await app.service('tasks').get(jobId)
// throws a Feathers NotFound error if the task does not exist
```

### Remove / cancel a task

```js
await app.service('tasks').remove(jobId)
```

This removes the job from the BullMQ queue (if still pending) **and** from the persistence service. If the job is already locked by an active worker, the queue removal is skipped silently and only the persistence record is removed.

### Track progress

A handler can report incremental progress with `job.updateProgress(...)`:

```js
createWorker(queueName, redis, {
  'generate-report': async (job) => {
    await job.updateProgress(50)
    // ... do work ...
    await job.updateProgress(100)
    return { url: '/reports/42.pdf' }
  }
})
```

Progress updates are stored on the persistence record under the `progress` field, and the handler's return value is stored under `result` once the job completes.

### React to status changes in real time

Because status transitions are written to a regular Feathers service, you get real-time updates for free. A connected client (or the server) can simply listen to the **persistence service** events:

```js
// client side, e.g. over Socket.IO
app.service('task-store').on('patched', (record) => {
  console.log(`Task ${record.id} → ${record.status}` +
    (record.progress != null ? ` (${record.progress}%)` : ''))
})
```

This is how the [`tasks` example](https://github.com/kalisio/feathers-ekosystem/tree/master/examples/tasks) renders a live task table without any polling.

### Advanced: delegating a job from within a handler

A handler may enqueue **other** jobs and wait for their result using BullMQ's `waitUntilFinished`. This enables true task composition where each sub-task is a real, observable queue job:

```js
import { QueueEvents } from '@kalisio/feathers-tasks'

const queueEvents = new QueueEvents(queueName, { connection: redis })

createWorker(queueName, redis, {
  'build-pdf': async (job) => {
    // delegate the screenshot to another job type
    const child = await queue.add('capture', { url: job.data.url })
    const capture = await child.waitUntilFinished(queueEvents)
    return buildPdf(capture)
  },
  capture: async (job) => takeScreenshot(job.data.url)
})
```

The [`print-tasks` example](https://github.com/kalisio/feathers-ekosystem/tree/master/examples/print-tasks) uses this pattern: a `pdfme` job delegates the map capture to a `kapture` job before assembling the final PDF.

## Task lifecycle

| Status | Description | Written by |
|--------|-------------|------------|
| `waiting` | Job submitted to the queue, not yet picked up | `TaskService.create` |
| `active` | Worker is currently processing the job | `setupQueueEvents` |
| `completed` | Handler resolved successfully | `setupQueueEvents` |
| `failed` | Handler threw an error (or max attempts reached) | `setupQueueEvents` |

Status transitions are written automatically to the persistence service by the `setupQueueEvents` listener. The persistence record evolves like this:

```js
// on create
{ id, type, payload, status: 'waiting', createdAt }
// → active
{ ..., status: 'active', startedAt }
// → progress (optional, repeatable)
{ ..., progress: 75 }
// → completed
{ ..., status: 'completed', result, completedAt }
// → failed
{ ..., status: 'failed', error, failedAt }
```

## Dashboard

`setupDashboard(app, queue, basePath)` mounts **Bull Board** as an Express middleware at `basePath`. It provides a web UI to inspect the queue, retry failed jobs and monitor workers.

```js
setupDashboard(app, queue, '/admin/tasks')
```

Navigate to `http://localhost:3030/admin/tasks` to access the dashboard.

> [!NOTE]
> The dashboard requires `@feathersjs/express` — it mounts directly on the underlying Express app.

## Examples

The repository ships several runnable examples that demonstrate increasing levels of complexity:

| Example | Demonstrates |
|---------|--------------|
| [`tasks`](https://github.com/kalisio/feathers-ekosystem/tree/master/examples/tasks) | The basics: submit, real-time tracking (Socket.IO), progress, cancellation, Bull Board |
| [`print-tasks`](https://github.com/kalisio/feathers-ekosystem/tree/master/examples/print-tasks) | Job-to-job delegation, Kapture screenshot service + PDF generation |
| [`tasks-orchestration`](https://github.com/kalisio/feathers-ekosystem/tree/master/examples/tasks-orchestration) | One ephemeral Docker container / Kubernetes pod per job |
| [`bpmn-orchestration`](https://github.com/kalisio/feathers-ekosystem/tree/master/examples/bpmn-orchestration) | A BPMN-driven workflow engine on top of the above |
