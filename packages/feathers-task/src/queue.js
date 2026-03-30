import { Queue } from 'bullmq'
import debugLib from 'debug'

const debug = debugLib('@kalisio/feathers-task:queue')

export function createQueue (name, redisOptions) {
  debug('Creating queue "%s"', name)
  const queue = new Queue(name, { connection: redisOptions })

  queue.on('error', (err) => {
    debug('Queue error: %o', err)
  })

  return queue
}
