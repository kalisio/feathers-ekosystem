---
title: API
description: API reference for the feathers-tasks building blocks
---

# API

`feathers-tasks` is assembled from composable building blocks — there is no single `app.configure()` plugin. Each function below is imported from `@kalisio/feathers-tasks`.

## createQueue (name, redisOptions)

Creates a BullMQ `Queue` connected to Redis and returns it.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Queue name — must match the worker and queue-events. |
| `redisOptions` | object | yes | Redis connection options passed to BullMQ (`{ host, port, password, ... }`). |

## createWorker (queueName, redisOptions, handlers?, concurrency?)

Creates a BullMQ `Worker` that dispatches each job to the handler matching its type, and returns it.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `queueName` | string | yes | Queue to consume. |
| `redisOptions` | object | yes | Redis connection options. |
| `handlers` | object | no | Map of `taskType → async (job) => any`. Selected from `job.name`. Default: `{}`. |
| `concurrency` | number | no | Jobs processed in parallel by this worker. Default: `1`. |

> If no handler matches a job's type, the worker resolves it as a no-op (it does not throw).

## setupQueueEvents (queueName, redisOptions, app, persistenceService)

Subscribes to the queue lifecycle events (`active`, `progress`, `completed`, `failed`) and patches the persistence record accordingly. Returns the `QueueEvents` instance.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `queueName` | string | yes | Queue to observe. |
| `redisOptions` | object | yes | Redis connection options. |
| `app` | Feathers app | yes | Used to resolve the persistence service. |
| `persistenceService` | string | yes | Name of the Feathers service holding task history. |

## setupDashboard (app, queue, basePath)

Mounts the [Bull Board](https://github.com/felixmosh/bull-board) UI as Express middleware on the underlying app.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `app` | Feathers app | yes | Must be an Express-powered Feathers app (`@feathersjs/express`). |
| `queue` | Queue | yes | The BullMQ queue to expose. |
| `basePath` | string | yes | URL path where the dashboard is served, e.g. `/admin/tasks`. |

## new TaskService ({ queue, persistenceService })

Feathers service constructor.

| Option | Type | Required | Description |
|---|---|---|---|
| `queue` | Queue | yes | A BullMQ queue (from `createQueue`). |
| `persistenceService` | string | yes | Name of the Feathers service used to store task history. |

Register it with `app.use('tasks', new TaskService({ ... }))`. Its methods follow.

## TaskService

### create (data, params)

Submits a new task to the BullMQ queue and creates a record in the persistence service.

| Property | Type | Required | Description |
|---|---|---|---|
| `data.type` | string | yes | Job type — matched against a key in `handlers`. |
| `data.payload` | object | no | Arbitrary data forwarded to the handler as `job.data`. |
| `data.options` | object | no | BullMQ [JobsOptions](https://api.docs.bullmq.io/types/v5.JobsOptions.html) (delay, attempts, priority, etc.). |

Returns the persisted task record:

| Field | Description |
|---|---|
| `id` | BullMQ job id. |
| `type` | Job type. |
| `payload` | Data passed to the handler. |
| `status` | `'waiting'` at creation time. |
| `createdAt` | ISO timestamp. |

### find (params)

Delegates to the persistence service. Accepts the same `params.query` as the underlying adapter.

Returns a list (or paginated result) of task records.

### get (id, params)

Retrieves a single task record from the persistence service by BullMQ job `id`.

| Parameter | Description |
|---|---|
| `id` | BullMQ job id (string). |

Throws `NotFound` if no record matches.

### patch (id, data, params)

Updates fields on a task record in the persistence service. Primarily used internally by the `QueueEvents` listener to reflect status changes.

| Parameter | Description |
|---|---|
| `id` | BullMQ job id. |
| `data` | Fields to merge into the record (e.g. `{ status, completedAt, result }`). |

### remove (id, params)

Cancels the BullMQ job (if still pending) and removes the record from the persistence service.

| Parameter | Description |
|---|---|
| `id` | BullMQ job id. |

Throws `NotFound` if no persistence record matches. Does not throw if the job is no longer in the queue (already completed/failed).
