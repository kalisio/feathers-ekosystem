import { NotFound } from '@feathersjs/errors'
import debugLib from 'debug'

const debug = debugLib('feathers-tasks:service')

export class TaskService {
  constructor ({ queue, persistenceService }) {
    this.queue = queue
    this.persistenceService = persistenceService
  }

  // Create (submit) a new task
  async create (data, params) {
    const { type, payload = {}, options = {} } = data
    debug('Creating task of type %s', type)

    const job = await this.queue.add(type, payload, options)

    const record = {
      id: job.id,
      type,
      payload,
      status: 'waiting',
      createdAt: new Date().toISOString()
    }

    const service = this._persistService()
    await service.create(record)

    return record
  }

  // List tasks (delegated to persistence service)
  async find (params) {
    return this._persistService().find(params)
  }

  // Get a single task by id
  async get (id, params) {
    const service = this._persistService()
    const record = await service.find({ query: { id } })
    const items = record.data || record
    if (!items.length) throw new NotFound(`Task ${id} not found`)
    return items[0]
  }

  // Update task fields (e.g. status patch from worker events)
  async patch (id, data, params) {
    const service = this._persistService()
    const items = await service.find({ query: { id } })
    const records = items.data || items
    if (!records.length) throw new NotFound(`Task ${id} not found`)
    return service.patch(records[0]._id || records[0].id, data)
  }

  // Remove / cancel a task
  async remove (id, params) {
    debug('Removing task %s', id)
    const job = await this.queue.getJob(id)
    if (job) {
      try {
        await job.remove()
      } catch (err) {
        // Job may be locked by an active worker — ignore, persistence record is still removed
        debug('Could not remove job %s from queue: %s', id, err.message)
      }
    }

    const service = this._persistService()
    const items = await service.find({ query: { id } })
    const records = items.data || items
    if (!records.length) throw new NotFound(`Task ${id} not found`)
    return service.remove(records[0]._id || records[0].id)
  }

  _persistService () {
    return this.app.service(this.persistenceService)
  }

  setup (app) {
    this.app = app
  }
}
