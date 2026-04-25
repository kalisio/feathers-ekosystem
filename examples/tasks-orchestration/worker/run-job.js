import { Worker } from 'bullmq'

const redis = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379
}
const queueName = process.env.QUEUE_NAME || 'orchestration-tasks'
const jobType = process.env.JOB_TYPE
const workerId = process.env.WORKER_ID || `worker-${process.pid}`
const orchestrator = process.env.ORCHESTRATOR || 'unknown'

if (!jobType) {
  console.error(`[${workerId}] JOB_TYPE env var is required`)
  process.exit(1)
}

console.log(`[${workerId}] Ephemeral worker starting — queue: ${queueName}, type: "${jobType}", orchestrator: ${orchestrator}`)
console.log(`[${workerId}] Redis: ${redis.host}:${redis.port}`)

let exitCode = 0
let handledJobId = null

const worker = new Worker(
  queueName,
  async (job) => {
    if (job.name !== jobType) {
      // Not our type — rate-limit this worker to avoid spinning
      await new Promise(resolve => setTimeout(resolve, 100))
      throw new Error(`wrong type: ${job.name}`)
    }

    handledJobId = job.id
    await job.log(`[${workerId}] picked up job`)
    const { steps = 3, label = 'task' } = job.data

    console.log(`[${workerId}] Processing job ${job.id} "${label}" (${steps} steps)`)

    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      const progress = Math.round((i / steps) * 100)
      await job.updateProgress(progress)
      console.log(`[${workerId}] Job ${job.id} — step ${i}/${steps} (${progress}%)`)
    }

    return {
      processedBy: workerId,
      orchestrator,
      jobId: job.id,
      label,
      steps,
      completedAt: new Date().toISOString(),
      ...(job.data.workflowInstanceId && { workflowInstanceId: job.data.workflowInstanceId }),
      ...(job.data.bpmnTaskId && { bpmnTaskId: job.data.bpmnTaskId })
    }
  },
  { connection: redis, concurrency: 1, lockDuration: 60000 }
)

worker.on('completed', async (job) => {
  if (job.id !== handledJobId) return
  console.log(`[${workerId}] ✓ Job ${job.id} completed`)
  await worker.close()
})

worker.on('failed', async (job, err) => {
  if (!job || job.id !== handledJobId) return
  console.error(`[${workerId}] ✗ Job ${job.id} failed: ${err.message}`)
  exitCode = 1
  await worker.close()
})

worker.on('error', (err) => {
  console.error(`[${workerId}] Worker error: ${err.message}`)
})

// Safety timeout so the ephemeral worker cannot linger if Redis state is inconsistent
const timeoutMs = Number(process.env.WORKER_TIMEOUT_MS) || 10 * 60 * 1000
const timer = setTimeout(async () => {
  console.error(`[${workerId}] Timeout reached, exiting`)
  exitCode = 2
  await worker.close()
}, timeoutMs)

worker.on('closed', () => {
  clearTimeout(timer)
  process.exit(exitCode)
})
