import { Worker } from 'bullmq'

const redis = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379
}

const queueName = process.env.QUEUE_NAME || 'orchestration-tasks'
const jobType = process.env.JOB_TYPE || 'generic-job'
const workerId = process.env.WORKER_ID || `worker-${process.pid}`
const concurrency = Number(process.env.CONCURRENCY) || 2

console.log(`[${workerId}] Starting — queue: ${queueName}, job type: "${jobType}", concurrency: ${concurrency}`)
console.log(`[${workerId}] Redis: ${redis.host}:${redis.port}`)

const worker = new Worker(
  queueName,
  async (job) => {
    if (job.name !== jobType) {
      return
    }

    const { steps = 3, label = 'task', workflowInstanceId, bpmnTaskId } = job.data

    console.log(`[${workerId}] Processing job ${job.id} "${label}" (${steps} steps)`)

    for (let i = 1; i <= steps; i++) {
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 500))
      const progress = Math.round((i / steps) * 100)
      await job.updateProgress(progress)
      console.log(`[${workerId}] Job ${job.id} — step ${i}/${steps} (${progress}%)`)
    }

    const result = {
      processedBy: workerId,
      orchestrator: process.env.ORCHESTRATOR || 'unknown',
      jobId: job.id,
      label,
      steps,
      completedAt: new Date().toISOString(),
      // Pass through workflow routing fields so the server can advance the BPMN engine
      ...(workflowInstanceId && { workflowInstanceId }),
      ...(bpmnTaskId && { bpmnTaskId })
    }

    console.log(`[${workerId}] Job ${job.id} completed`)
    return result
  },
  { connection: redis, concurrency }
)

worker.on('completed', (job, result) => {
  console.log(`[${workerId}] ✓ Job ${job.id} done — processed by ${result?.processedBy}`)
})

worker.on('failed', (job, err) => {
  console.error(`[${workerId}] ✗ Job ${job?.id} failed: ${err.message}`)
})

worker.on('error', (err) => {
  console.error(`[${workerId}] Worker error: ${err.message}`)
})

// Graceful shutdown
async function shutdown () {
  console.log(`[${workerId}] Shutting down...`)
  await worker.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
