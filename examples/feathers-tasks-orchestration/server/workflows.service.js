import { NotFound } from '@feathersjs/errors'
import { readFile } from 'fs/promises'
import { WorkflowEngine } from './workflow-engine.js'

export class WorkflowsService {
  constructor (options = {}) {
    this.store = options.store
    this.engine = new WorkflowEngine()
  }

  setup (app) {
    this.app = app
  }

  async create (data) {
    const { name = 'Unnamed workflow', bpmnXml, autoRun = true } = data

    const xml = bpmnXml || (data.bpmnFile ? await readFile(data.bpmnFile, 'utf-8') : null)
    if (!xml) throw new Error('Provide either bpmnXml or bpmnFile')

    const record = {
      name,
      bpmnXml: xml,
      instances: [],
      createdAt: new Date().toISOString()
    }

    const stored = await this.store.create(record)

    if (autoRun) {
      await this._launchInstance(stored)
    }

    return this.store.get(stored.id)
  }

  async find (params) {
    return this.store.find(params)
  }

  async get (id) {
    const result = await this.store.find({ query: { id } })
    const items = result.data || result
    if (!items.length) throw new NotFound(`Workflow ${id} not found`)
    return items[0]
  }

  async patch (id, data) {
    if (data.action !== 'run') throw new Error('Only action "run" is supported via patch')
    const workflow = await this.get(id)
    await this._launchInstance(workflow)
    return this.store.get(id)
  }

  async _launchInstance (workflow) {
    const tasksService = this.app.service('tasks')

    const onComplete = async (result) => {
      console.log(`[workflow-engine] Instance ${result.instanceId} completed`)
      await this._updateInstance(workflow.id, result.instanceId, {
        status: 'completed',
        completedAt: result.completedAt
      })
      this.engine.removeInstance(result.instanceId)
      this.app.service('workflows').emit('instance-completed', {
        workflowId: workflow.id,
        instanceId: result.instanceId
      })
    }

    const onError = async (err) => {
      console.error(`[workflow-engine] Instance error: ${err.message}`)
      const wf = await this.store.get(workflow.id)
      const running = (wf.instances || []).find(i => i.status === 'running')
      if (running) {
        await this._updateInstance(workflow.id, running.instanceId, {
          status: 'failed',
          error: err.message
        })
      }
    }

    const instanceId = await this.engine.launch(workflow.bpmnXml, tasksService, onComplete, onError)

    const wf = await this.store.get(workflow.id)
    const instances = [...(wf.instances || []), {
      instanceId,
      status: 'running',
      startedAt: new Date().toISOString()
    }]
    await this.store.patch(workflow.id, { instances })

    console.log(`[workflow-engine] Instance ${instanceId} started for workflow "${workflow.name}"`)
    return instanceId
  }

  async _updateInstance (workflowId, instanceId, patch) {
    const wf = await this.store.get(workflowId)
    const instances = (wf.instances || []).map(i =>
      i.instanceId === instanceId ? { ...i, ...patch } : i
    )
    await this.store.patch(workflowId, { instances })
  }

  async notifyJobCompleted (jobId, result) {
    const workflowInstanceId = result?.workflowInstanceId
    await this.engine.notifyJobCompleted(jobId, result, workflowInstanceId)
  }

  async notifyJobFailed (jobId, error, workflowInstanceId) {
    await this.engine.notifyJobFailed(jobId, error, workflowInstanceId)
  }
}
