import { MemoryService } from '@feathersjs/memory'

/**
 * Tracks the lifecycle of each ephemeral runner (Docker container or K8s pod)
 * spawned to execute a task. One runner = one job.
 *
 * Records carry:
 *   - id                     : runner record id
 *   - jobId                  : BullMQ job id
 *   - jobType                : job type (e.g. "docker-job", "k8s-job")
 *   - orchestrator           : "docker" | "kubernetes"
 *   - containerId / podName  : orchestrator-specific identifier
 *   - status                 : "starting" | "running" | "completed" | "failed"
 *   - createdAt / startedAt / finishedAt
 *   - exitCode               : optional (Docker)
 *   - error                  : optional message
 */
export class RunnersService extends MemoryService {
  constructor (options = {}) {
    super({ multi: true, ...options })
  }
}
