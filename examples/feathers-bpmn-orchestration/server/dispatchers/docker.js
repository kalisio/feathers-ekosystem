import Docker from 'dockerode'
import debugLib from 'debug'

const debug = debugLib('dispatcher:docker')

export class DockerDispatcher {
  /**
   * @param {object} options
   * @param {string} options.image            Docker image implementing worker/run-job.js
   * @param {string} options.queueName        BullMQ queue name
   * @param {{host:string, port:number}} options.redis    Redis coordinates *as seen from inside the container*
   * @param {string} [options.networkMode='bridge']
   * @param {object} options.runnersService   Feathers service for lifecycle tracking
   */
  constructor (options) {
    this.image = options.image
    this.queueName = options.queueName
    this.redis = options.redis
    this.networkMode = options.networkMode || 'bridge'
    this.runnersService = options.runnersService

    this.docker = new Docker(options.docker || {})
  }

  /**
   * Spawn one ephemeral container for a single job.
   *
   * @param {{ id:string, name:string }} job — BullMQ job descriptor
   * @returns {Promise<object>} runner record
   */
  async dispatch (job) {
    const workerId = `docker-${job.id}`
    const name = `tasks-worker-${job.id}-${Date.now()}`

    const runner = await this.runnersService.create({
      jobId: job.id,
      jobType: job.name,
      orchestrator: 'docker',
      containerId: null,
      name,
      status: 'starting',
      createdAt: new Date().toISOString()
    })

    debug('Creating container %s for job %s (type %s)', name, job.id, job.name)

    let container
    try {
      container = await this.docker.createContainer({
        Image: this.image,
        name,
        Env: [
          `REDIS_HOST=${this.redis.host}`,
          `REDIS_PORT=${this.redis.port}`,
          `QUEUE_NAME=${this.queueName}`,
          `JOB_TYPE=${job.name}`,
          `WORKER_ID=${workerId}`,
          'ORCHESTRATOR=docker'
        ],
        HostConfig: {
          NetworkMode: this.networkMode,
          AutoRemove: false,
          ExtraHosts: ['host.docker.internal:host-gateway']
        },
        Labels: {
          'feathers-tasks.job-id': String(job.id),
          'feathers-tasks.job-type': job.name
        }
      })

      await container.start()
      await this.runnersService.patch(runner.id, {
        containerId: container.id,
        status: 'running',
        startedAt: new Date().toISOString()
      })

      debug('Container %s (%s) started for job %s', name, container.id, job.id)

      this._watch(runner.id, container, name).catch(err => {
        console.error(`[dispatcher:docker] watch failed for ${name}:`, err.message)
      })

      return { ...runner, containerId: container.id }
    } catch (err) {
      await this.runnersService.patch(runner.id, {
        status: 'failed',
        error: err.message,
        finishedAt: new Date().toISOString()
      })
      throw err
    }
  }

  async _watch (runnerId, container, name) {
    const { StatusCode } = await container.wait()
    const status = StatusCode === 0 ? 'completed' : 'failed'
    debug('Container %s finished (exit %d)', name, StatusCode)

    await this.runnersService.patch(runnerId, {
      status,
      exitCode: StatusCode,
      finishedAt: new Date().toISOString()
    })

    try {
      await container.remove({ force: true })
    } catch (err) {
      debug('Cleanup of %s failed: %s', name, err.message)
    }
  }
}
