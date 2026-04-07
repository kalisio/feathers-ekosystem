import { QueueEvents } from 'bullmq'
import debugLib from 'debug'

const debug = debugLib('feathers-tasks:events')

// Maps BullMQ job events to status updates in the persistence service
export function setupQueueEvents (queueName, redisOptions, app, persistenceService) {
  debug('Setting up queue events for "%s"', queueName)

  const queueEvents = new QueueEvents(queueName, { connection: redisOptions })

  async function patchStatus (jobId, patch) {
    try {
      const service = app.service(persistenceService)
      const items = await service.find({ query: { id: jobId } })
      const records = items.data || items
      if (!records.length) return
      await service.patch(records[0]._id || records[0].id, patch)
    } catch (err) {
      debug('Failed to patch task %s: %o', jobId, err)
    }
  }

  queueEvents.on('active', ({ jobId }) => {
    debug('Job %s is active', jobId)
    patchStatus(jobId, { status: 'active', startedAt: new Date().toISOString() })
  })

  queueEvents.on('completed', ({ jobId, returnvalue }) => {
    debug('Job %s completed', jobId)
    const result = returnvalue ? JSON.parse(returnvalue) : null
    patchStatus(jobId, { status: 'completed', result, completedAt: new Date().toISOString() })
  })

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    debug('Job %s failed: %s', jobId, failedReason)
    patchStatus(jobId, { status: 'failed', error: failedReason, failedAt: new Date().toISOString() })
  })

  queueEvents.on('progress', ({ jobId, data }) => {
    debug('Job %s progress: %o', jobId, data)
    patchStatus(jobId, { progress: data })
  })

  queueEvents.on('error', (err) => {
    debug('QueueEvents error: %o', err)
  })

  return queueEvents
}
