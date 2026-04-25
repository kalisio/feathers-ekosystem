import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import debugLib from 'debug'

const debug = debugLib('feathers-tasks:dashboard')

export function setupDashboard (app, queue, basePath) {
  debug('Setting up Bull Board at %s', basePath)

  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath(basePath)

  createBullBoard({
    queues: [new BullMQAdapter(queue)],
    serverAdapter
  })

  // Mount on the underlying Express app
  const expressApp = app.express ? app.express() : app
  expressApp.use(basePath, serverAdapter.getRouter())

  debug('Bull Board mounted at %s', basePath)
}
