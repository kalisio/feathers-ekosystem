import { Worker } from 'bullmq'
import debugLib from 'debug'

const debug = debugLib('@kalisio/feathers-task:worker')

export function createWorker (queueName, redisOptions, handlers = {}, concurrency = 1) {
  debug('Creating worker for queue "%s" (concurrency: %d)', queueName, concurrency)

  const worker = new Worker(
    queueName,
    async (job) => {
      const handler = handlers[job.name]
      if (!handler) {
        debug('No handler registered for job type "%s"', job.name)
        return
      }
      debug('Processing job %s of type "%s"', job.id, job.name)
      return handler(job)
    },
    {
      connection: redisOptions,
      concurrency
    }
  )

  worker.on('completed', (job, result) => {
    debug('Job %s completed', job.id)
  })

  worker.on('failed', (job, err) => {
    debug('Job %s failed: %o', job?.id, err)
  })

  worker.on('error', (err) => {
    debug('Worker error: %o', err)
  })

  return worker
}
