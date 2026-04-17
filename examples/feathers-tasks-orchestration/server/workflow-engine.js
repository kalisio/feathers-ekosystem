import { BpmnModdle } from 'bpmn-moddle'
import debugLib from 'debug'

const debug = debugLib('workflow-engine')

const moddle = new BpmnModdle()

async function parseBpmn (xml) {
  const { rootElement } = await moddle.fromXML(xml)
  const process = rootElement.rootElements.find(e => e.$type === 'bpmn:Process')
  if (!process) throw new Error('No bpmn:Process found in the BPMN definition')
  return process
}

function getExtension (task, name) {
  const ext = task.extensionElements?.values || []
  for (const el of ext) {
    if (el.$type?.endsWith(`:${name}`) || el.$type === name) return el.$body
  }
  return null
}

function buildElementMap (process) {
  const map = {}
  for (const el of process.flowElements) {
    map[el.id] = el
  }
  return map
}

function getNextIds (elementId, elementMap) {
  return Object.values(elementMap)
    .filter(e => e.$type === 'bpmn:SequenceFlow' && e.sourceRef?.id === elementId)
    .map(e => e.targetRef?.id)
    .filter(Boolean)
}

export class WorkflowInstance {
  /**
   * @param {string} instanceId
   * @param {object} process
   * @param {object} tasksService
   * @param {function} onComplete
   * @param {function} onError
   */
  constructor (instanceId, process, tasksService, onComplete, onError) {
    this.instanceId = instanceId
    this.process = process
    this.elementMap = buildElementMap(process)
    this.tasksService = tasksService
    this.onComplete = onComplete
    this.onError = onError

    this.jobToElement = {}

    this.joinCounters = {}

    this.joinExpected = {}

    this._precomputeJoinExpectations()
  }

  _precomputeJoinExpectations () {
    for (const el of Object.values(this.elementMap)) {
      if (el.$type !== 'bpmn:ParallelGateway') continue
      const incomingCount = Object.values(this.elementMap).filter(
        e => e.$type === 'bpmn:SequenceFlow' && e.targetRef?.id === el.id
      ).length
      if (incomingCount > 1) {
        this.joinExpected[el.id] = incomingCount
        this.joinCounters[el.id] = 0
        debug('Join gateway "%s" expects %d branches', el.id, incomingCount)
      }
    }
  }

  async start () {
    debug('[%s] Starting workflow', this.instanceId)
    const startEvent = Object.values(this.elementMap).find(e => e.$type === 'bpmn:StartEvent')
    if (!startEvent) throw new Error('No startEvent found in BPMN process')
    await this._advance(startEvent.id)
  }

  async onJobCompleted (jobId, result) {
    const elementId = this.jobToElement[jobId]
    if (!elementId) return // not our job
    debug('[%s] Job %s completed (element: %s)', this.instanceId, jobId, elementId)
    await this._advance(elementId, result)
  }

  async onJobFailed (jobId, error) {
    const elementId = this.jobToElement[jobId]
    if (!elementId) return
    debug('[%s] Job %s failed (element: %s): %s', this.instanceId, jobId, elementId, error)
    this.onError(new Error(`Task "${elementId}" failed: ${error}`))
  }

  async _advance (fromElementId, previousResult = null) {
    const nextIds = getNextIds(fromElementId, this.elementMap)
    for (const nextId of nextIds) {
      await this._process(nextId, previousResult)
    }
  }

  async _process (elementId, previousResult) {
    const el = this.elementMap[elementId]
    if (!el) {
      debug('[%s] Unknown element: %s', this.instanceId, elementId)
      return
    }

    debug('[%s] Processing element "%s" (%s)', this.instanceId, elementId, el.$type)

    switch (el.$type) {
      case 'bpmn:StartEvent':
        await this._advance(elementId)
        break

      case 'bpmn:EndEvent':
        debug('[%s] Workflow completed', this.instanceId)
        this.onComplete({ instanceId: this.instanceId, completedAt: new Date().toISOString() })
        break

      case 'bpmn:ServiceTask':
        await this._submitJob(el, previousResult)
        break

      case 'bpmn:ParallelGateway':
        await this._handleParallelGateway(elementId, previousResult)
        break

      default:
        debug('[%s] Skipping unsupported element type: %s', this.instanceId, el.$type)
        await this._advance(elementId, previousResult)
    }
  }

  async _submitJob (serviceTask, previousResult) {
    const jobType = getExtension(serviceTask, 'jobType')
    const steps = Number(getExtension(serviceTask, 'steps')) || 3

    if (!jobType) {
      debug('[%s] ServiceTask "%s" has no meta:jobType — skipping', this.instanceId, serviceTask.id)
      await this._advance(serviceTask.id)
      return
    }

    debug('[%s] Submitting job type="%s" for task "%s"', this.instanceId, jobType, serviceTask.id)

    const task = await this.tasksService.create({
      type: jobType,
      payload: {
        label: serviceTask.name || serviceTask.id,
        steps,
        workflowInstanceId: this.instanceId,
        bpmnTaskId: serviceTask.id,
        previousResult
      }
    })

    this.jobToElement[task.id] = serviceTask.id
    debug('[%s] Job %s registered for element "%s"', this.instanceId, task.id, serviceTask.id)
  }

  async _handleParallelGateway (gatewayId, previousResult) {
    if (this.joinExpected[gatewayId] !== undefined) {
      this.joinCounters[gatewayId]++
      debug(
        '[%s] Join gateway "%s": %d/%d branches arrived',
        this.instanceId, gatewayId,
        this.joinCounters[gatewayId], this.joinExpected[gatewayId]
      )
      if (this.joinCounters[gatewayId] < this.joinExpected[gatewayId]) return

      this.joinCounters[gatewayId] = 0
    }

    await this._advance(gatewayId, previousResult)
  }
}

export class WorkflowEngine {
  constructor () {
    this.instances = new Map()
  }

  async launch (bpmnXml, tasksService, onComplete, onError) {
    const process = await parseBpmn(bpmnXml)
    const instanceId = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    const instance = new WorkflowInstance(instanceId, process, tasksService, onComplete, onError)
    this.instances.set(instanceId, instance)

    await instance.start()
    return instanceId
  }

  async notifyJobCompleted (jobId, result, workflowInstanceId) {
    if (workflowInstanceId) {
      const instance = this.instances.get(workflowInstanceId)
      if (instance) await instance.onJobCompleted(jobId, result)
    } else {
      for (const instance of this.instances.values()) {
        await instance.onJobCompleted(jobId, result)
      }
    }
  }

  async notifyJobFailed (jobId, error, workflowInstanceId) {
    if (workflowInstanceId) {
      const instance = this.instances.get(workflowInstanceId)
      if (instance) await instance.onJobFailed(jobId, error)
    } else {
      for (const instance of this.instances.values()) {
        await instance.onJobFailed(jobId, error)
      }
    }
  }

  getInstance (instanceId) {
    return this.instances.get(instanceId)
  }

  removeInstance (instanceId) {
    this.instances.delete(instanceId)
  }
}
