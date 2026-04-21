import * as k8s from '@kubernetes/client-node'
import debugLib from 'debug'

const debug = debugLib('dispatcher:kubernetes')

export class KubernetesDispatcher {
  /**
   * @param {object} options
   * @param {string} options.image            Container image used for the ephemeral Pod
   * @param {string} options.queueName
   * @param {{host:string, port:number}} options.redis    Redis coordinates *as seen from inside the Pod*
   * @param {string} [options.namespace='default']
   * @param {string} [options.imagePullPolicy='Never']    Defaults to Never (local build workflow)
   * @param {boolean} [options.hostNetwork=false]
   * @param {object} options.runnersService
   */
  constructor (options) {
    this.image = options.image
    this.queueName = options.queueName
    this.redis = options.redis
    this.namespace = options.namespace || 'default'
    this.imagePullPolicy = options.imagePullPolicy || 'Never'
    this.hostNetwork = options.hostNetwork || false
    this.runnersService = options.runnersService

    this.kc = new k8s.KubeConfig()
    this.kc.loadFromDefault()
    this.batch = this.kc.makeApiClient(k8s.BatchV1Api)
    this.core = this.kc.makeApiClient(k8s.CoreV1Api)
  }

  /**
   * Create a Kubernetes Job running the ephemeral worker for exactly one BullMQ job.
   */
  async dispatch (job) {
    const workerId = `k8s-${job.id}`
    const name = `tasks-worker-${String(job.id).toLowerCase()}-${Date.now().toString(36)}`

    const runner = await this.runnersService.create({
      jobId: job.id,
      jobType: job.name,
      orchestrator: 'kubernetes',
      podName: null,
      jobName: name,
      namespace: this.namespace,
      status: 'starting',
      createdAt: new Date().toISOString()
    })

    debug('Creating K8s Job %s in namespace %s for BullMQ job %s', name, this.namespace, job.id)

    const manifest = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name,
        labels: {
          app: 'feathers-tasks-worker',
          'feathers-tasks.job-id': String(job.id),
          'feathers-tasks.job-type': job.name
        }
      },
      spec: {
        backoffLimit: 0,
        ttlSecondsAfterFinished: 300,
        template: {
          metadata: {
            labels: {
              app: 'feathers-tasks-worker',
              'feathers-tasks.job-id': String(job.id)
            }
          },
          spec: {
            restartPolicy: 'Never',
            hostNetwork: this.hostNetwork,
            ...(this.hostNetwork && { dnsPolicy: 'ClusterFirstWithHostNet' }),
            containers: [{
              name: 'worker',
              image: this.image,
              imagePullPolicy: this.imagePullPolicy,
              env: [
                { name: 'REDIS_HOST', value: this.redis.host },
                { name: 'REDIS_PORT', value: String(this.redis.port) },
                { name: 'QUEUE_NAME', value: this.queueName },
                { name: 'JOB_TYPE', value: job.name },
                { name: 'WORKER_ID', value: workerId },
                { name: 'ORCHESTRATOR', value: 'kubernetes' }
              ],
              resources: {
                requests: { cpu: '100m', memory: '128Mi' },
                limits: { cpu: '500m', memory: '256Mi' }
              }
            }]
          }
        }
      }
    }

    try {
      await this.batch.createNamespacedJob({ namespace: this.namespace, body: manifest })
      await this.runnersService.patch(runner.id, {
        status: 'running',
        startedAt: new Date().toISOString()
      })
      debug('K8s Job %s created for BullMQ job %s', name, job.id)

      this._watch(runner.id, name).catch(err => {
        console.error(`[dispatcher:kubernetes] watch failed for ${name}:`, err.message)
      })

      return runner
    } catch (err) {
      await this.runnersService.patch(runner.id, {
        status: 'failed',
        error: err.message,
        finishedAt: new Date().toISOString()
      })
      throw err
    }
  }

  async _watch (runnerId, jobName) {
    const deadline = Date.now() + (10 * 60 * 1000)
    let podNameSeen = null

    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      try {
        const pods = await this.core.listNamespacedPod({
          namespace: this.namespace,
          labelSelector: 'feathers-tasks.job-id'
        })
        const pod = pods.items.find(p =>
          p.metadata?.labels?.['batch.kubernetes.io/job-name'] === jobName ||
          p.metadata?.labels?.['job-name'] === jobName
        )
        if (pod?.metadata?.name && pod.metadata.name !== podNameSeen) {
          podNameSeen = pod.metadata.name
          await this.runnersService.patch(runnerId, { podName: podNameSeen })
          debug('Pod %s backs K8s Job %s', podNameSeen, jobName)
        }

        const job = await this.batch.readNamespacedJob({ name: jobName, namespace: this.namespace })
        const succeeded = job.status?.succeeded || 0
        const failed = job.status?.failed || 0

        if (succeeded > 0) {
          await this.runnersService.patch(runnerId, {
            status: 'completed',
            finishedAt: new Date().toISOString()
          })
          debug('K8s Job %s succeeded', jobName)
          return
        }
        if (failed > 0) {
          await this.runnersService.patch(runnerId, {
            status: 'failed',
            finishedAt: new Date().toISOString()
          })
          debug('K8s Job %s failed', jobName)
          return
        }
      } catch (err) {
        debug('watch iteration error for %s: %s', jobName, err.message)
      }
    }

    await this.runnersService.patch(runnerId, {
      status: 'failed',
      error: 'watch timed out',
      finishedAt: new Date().toISOString()
    })
  }
}
