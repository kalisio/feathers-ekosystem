import debugLib from 'debug'

const debug = debugLib('@kalisio/feathers-task:dashboard')

export async function setupDashboard (app, queue, basePath) {
  debug('Setting up Bull Board at %s', basePath)

  const { createBullBoard } = await import('@bull-board/api')
  const { BullMQAdapter } = await import('@bull-board/api/bullMQAdapter')
  const { ExpressAdapter } = await import('@bull-board/express')

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
