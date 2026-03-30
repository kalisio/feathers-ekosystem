---
title: Service
description: Feathers service for background task execution
---

# Service

## feathersTasks (options)

Configures and registers the `tasks` service on a Feathers application. Called via `app.configure()`.

| Parameter | Description | Required |
|---|---|---|
| `persistenceService` | Name of the Feathers service used to persist task records. | yes |
| `redis` | Redis connection options passed directly to BullMQ (`{ host, port, password, ... }`). | yes |
| `queue.name` | BullMQ queue name. Default: `'tasks'`. | no |
| `queue.concurrency` | Number of jobs processed in parallel by the worker. Default: `1`. | no |
| `handlers` | Object mapping job type names to async handler functions `(job) => any`. | no |
| `dashboard.enabled` | Mount the Bull Board UI. Default: `false`. | no |
| `dashboard.basePath` | Base path for the Bull Board Express router. Default: `'/admin/tasks'`. | no |

Registers `app.service('tasks')` as a `TaskService` instance.

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
