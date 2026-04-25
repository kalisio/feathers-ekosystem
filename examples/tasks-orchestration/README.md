# feathers-tasks-orchestration

Submit tasks to a BullMQ queue; the server spawns **one ephemeral Docker container or Kubernetes pod per job** to execute it, via [`dockerode`](https://github.com/apocas/dockerode) and [`@kubernetes/client-node`](https://github.com/kubernetes-client/javascript) respectively.

No BPMN, no workflows — this example focuses on the dispatch + tracking mechanics. For a BPMN-driven version, see [`examples/feathers-bpmn-orchestration`](../feathers-bpmn-orchestration/).

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│ Feathers server (this process)                                │
│                                                               │
│  POST /tasks { type:"docker-job" | "k8s-job" }                │
│        │                                                      │
│        ▼                                                      │
│   BullMQ queue (Redis)                                        │
│        │                                                      │
│        ▼  QueueEvents 'waiting'                               │
│   Dispatcher router ──┬──► DockerDispatcher   (dockerode)     │
│                       └──► KubernetesDispatcher (K8s API)     │
│                              │                                │
│                              ▼ creates one container / pod    │
└──────────────────────────────┼────────────────────────────────┘
                               │
                               ▼
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
     Docker container                     Kubernetes pod
     (ephemeral, one job)                 (ephemeral, one job)
     runs worker/run-job.js               runs worker/run-job.js
             │                                   │
             └──────────┬────────────────────────┘
                        ▼
                  BullMQ Worker picks the job,
                  executes it, updates progress,
                  returns the result, exits.
                        │
                        ▼
       Container / pod exits; dispatcher watches
       the lifecycle and updates the `runners` service.
```

## Key files

| File | Role |
|------|------|
| [server/index.js](server/index.js) | Feathers app, queue wiring, dispatcher router |
| [server/runners.service.js](server/runners.service.js) | Feathers `runners` service — tracks every container/pod spawned |
| [server/dispatchers/docker.js](server/dispatchers/docker.js) | Creates a Docker container per job (dockerode) |
| [server/dispatchers/kubernetes.js](server/dispatchers/kubernetes.js) | Creates a Kubernetes Job per BullMQ job (`batch/v1`) |
| [worker/run-job.js](worker/run-job.js) | Ephemeral BullMQ worker — picks **one** job then exits |
| [Dockerfile](Dockerfile) | Builds the worker image used by both dispatchers |

## Prerequisites

- **Node 20+**, **pnpm 10+**
- **Redis** on `localhost:6379`
- **Docker** with the daemon socket accessible to your user (`/var/run/docker.sock`)
- **A local Kubernetes cluster** (`kind`, `k3d`, `minikube`, Docker Desktop, …) with a working `kubectl` context
- A common container image visible from both Docker and the K8s cluster (see **Build the worker image** below)

> The K8s dispatcher uses `imagePullPolicy: Never` by default (local dev). For clusters like `kind` you must `kind load docker-image feathers-tasks-worker:latest`. For `minikube`, build inside the VM (`eval $(minikube docker-env)`). For Docker Desktop's K8s the image is automatically shared.

## Getting started

```bash
# 1 — Install dependencies (from the workspace root)
pnpm install

# 2 — Start Redis
redis-server

# 3 — Build the worker image (from the example folder)
cd examples/feathers-tasks-orchestration
pnpm build:image
#   → builds feathers-tasks-worker:latest using Dockerfile from the workspace root.

# 4 — (kind only) Load the image into the cluster
kind load docker-image feathers-tasks-worker:latest

# 5 — Start the server
pnpm dev:server
```

Expected output:

```
Server listening on http://localhost:3030
Bull Board:   http://localhost:3030/admin/tasks
Redis:        localhost:6379
Queue:        orchestration-tasks
Worker image: feathers-tasks-worker:latest
```

## Submitting jobs

### Docker job

```bash
curl -X POST http://localhost:3030/tasks \
  -H 'Content-Type: application/json' \
  -d '{"type":"docker-job","payload":{"label":"hello docker","steps":4}}'
```

The server logs:

```
[dispatcher] Spawning Docker container for job 1
```

Observe live:

```bash
docker ps --filter label=feathers-tasks.job-id
```

### Kubernetes job

```bash
curl -X POST http://localhost:3030/tasks \
  -H 'Content-Type: application/json' \
  -d '{"type":"k8s-job","payload":{"label":"hello k8s","steps":3}}'
```

Observe live:

```bash
kubectl get jobs -l app=feathers-tasks-worker
kubectl get pods -l app=feathers-tasks-worker
kubectl logs -l feathers-tasks.job-id=<id> --tail=50
```

## Observing state

| Endpoint | What you see |
|----------|--------------|
| `GET /tasks` | BullMQ-backed task store: status, progress, result |
| `GET /runners` | One record per container/pod, with orchestrator, containerId/podName, status, timestamps |
| `http://localhost:3030/admin/tasks` | Bull Board UI |

Example `GET /runners` record:

```json
{
  "id": 0,
  "jobId": "1",
  "jobType": "docker-job",
  "orchestrator": "docker",
  "containerId": "b12f…",
  "name": "tasks-worker-1-1745211234",
  "status": "completed",
  "createdAt": "…",
  "startedAt": "…",
  "finishedAt": "…",
  "exitCode": 0
}
```

## Configuration (environment variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | `3030` | HTTP port of the server |
| `REDIS_HOST` | `localhost` | Redis host used by the server |
| `REDIS_PORT` | `6379` | Redis port |
| `QUEUE_NAME` | `orchestration-tasks` | BullMQ queue name |
| `WORKER_IMAGE` | `feathers-tasks-worker:latest` | Image used by both dispatchers |
| `REDIS_HOST_FOR_DOCKER` | `host.docker.internal` | Redis host **as seen from inside a Docker container**. On Linux this resolves to the gateway (added via `host-gateway`). |
| `REDIS_HOST_FOR_K8S` | `localhost` | Redis host **as seen from inside a K8s pod**. Works by default because `hostNetwork: true` is used. |
| `K8S_NAMESPACE` | `default` | Namespace for the K8s Jobs |
| `K8S_IMAGE_PULL_POLICY` | `Never` | Assumes locally built image |
| `K8S_HOST_NETWORK` | `1` | Set to `0` to disable hostNetwork (then provide an in-cluster Redis host via `REDIS_HOST_FOR_K8S`) |

## How it works (step by step)

1. Client `POST /tasks {type, payload}` → `TaskService.create()` enqueues a job in the BullMQ queue.
2. Redis notifies the `QueueEvents` listener with `'waiting'` + jobId.
3. The dispatcher router looks up `job.name` (`docker-job` / `k8s-job`) and calls the matching dispatcher.
4. **DockerDispatcher**: `dockerode.createContainer()` → `container.start()` → records the runner → `container.wait()` updates status on exit.
5. **KubernetesDispatcher**: `BatchV1Api.createNamespacedJob()` → polls the Job + its Pods → updates the runner with `podName` and final status.
6. Inside the container/pod, `worker/run-job.js` runs a BullMQ `Worker` configured with `concurrency: 1` that picks **one** matching job, reports progress, returns a result, then `worker.close()` and `process.exit()`.
7. The server receives the standard BullMQ `'completed'` event, patches the `task-store`, and the corresponding runner record is updated once the container/pod terminates.

## Troubleshooting

- **Dispatcher fails with `connect EACCES /var/run/docker.sock`** — add your user to the `docker` group, or run with appropriate permissions.
- **K8s Job pod stays `ImagePullBackOff`** — the image is not visible to the cluster. Load it (`kind load docker-image …`) or push it to a registry and change `K8S_IMAGE_PULL_POLICY`.
- **Worker connects to Redis but finds no job** — check that `REDIS_HOST_FOR_DOCKER` resolves from inside the container: `docker run --rm --add-host=host.docker.internal:host-gateway alpine/curl curl host.docker.internal:6379`.
- **Several jobs arrive before the dispatcher reacts** — workers are filtered by `JOB_TYPE`, and a worker that finds an unexpected type fails fast and exits. The server simply spawns another runner for each `'waiting'` event.

## Feathers services

| Service | Implementation | Purpose |
|---------|---------------|---------|
| `task-store` | `MemoryService` | Task metadata (status, progress, timestamps) |
| `tasks` | `TaskService` (`@kalisio/feathers-tasks`) | BullMQ queue interface |
| `runners` | `RunnersService` | Container/pod lifecycle records |

All services publish real-time events on the `anonymous` Socket.IO channel.
