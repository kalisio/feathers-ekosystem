import { sorter, select, getLimit, AdapterBase } from '@feathersjs/adapter-commons'
import { _ } from '@feathersjs/commons'
import errors from '@feathersjs/errors'
import LocalForage from 'localforage'
import sift from 'sift'
import makeDebug from 'debug'
import { stringsToDates } from './utils.js'

export { default as LocalForage } from 'localforage'

const debug = makeDebug('@feathersjs-offline:feathers-localforage')
const usedKeys = []

const _select = (data, params, ...args) => {
  const base = select(params, ...args)
  return base(JSON.parse(JSON.stringify(data)))
}

const validDrivers = {
  INDEXEDDB: LocalForage.INDEXEDDB,
  WEBSQL: LocalForage.WEBSQL,
  LOCALSTORAGE: LocalForage.LOCALSTORAGE
}

export class LocalForageAdapter extends AdapterBase {
  constructor (options = {}) {
    super(_.extend({
      id: 'id',
      matcher: sift,
      sorter
    }, options))

    this.store = options.store || {}
    this._dates = options.dates || false

    this.sanitizeParameters(options)

    debug(`Constructor started:
\t_storageType = ${JSON.stringify(this._storageType)}
\t_version = ${JSON.stringify(this._version)}
\t_name = ${JSON.stringify(this._name)}
\t_storageKey = ${JSON.stringify(this._storageKey)}
\t_storageSize = ${JSON.stringify(this._storageSize)}
\t_reuseKeys = ${JSON.stringify(this._reuseKeys)}\n`)

    this._storage = LocalForage.createInstance({
      driver: this._storageType,
      name: this._name,
      size: this._storageSize,
      version: this._version,
      storeName: this._storageKey,
      description: 'Created by @feathersjs-offline/localforage'
    })

    this.checkStoreName()

    this._debugSuffix = this._name.includes('_local')
      ? '  LOCAL'
      : (this._name.includes('_queue') ? '  QUEUE' : '')

    this._ready = null
  }

  sanitizeParameters (options) {
    this._name = options.name || 'feathersjs-offline'
    this._storageKey = options.storeName || options.name || 'feathers'

    let storage = this.options.storage || 'LOCALSTORAGE'
    storage = Array.isArray(storage) ? storage : [storage]
    const ok = storage.reduce((value, s) => value && (s.toUpperCase() in validDrivers), true)
    if (!ok) {
      throw new errors.NotAcceptable(`Unknown storage type specified '${this.options.storage}\nPlease use one (or more) of 'websql', 'indexeddb', or 'localstorage'.`)
    }

    this._storageType = storage.map(s => validDrivers[s.toUpperCase()])
    this._version = options.version || 1.0
    this._storageSize = options.storageSize || 4980736
    this._reuseKeys = options.reuseKeys || false
    this._id = options.startId || 0
  }

  checkStoreName () {
    if (usedKeys.indexOf(this._storageKey) === -1) {
      usedKeys.push(this._storageKey)
    } else {
      if (!this._reuseKeys) {
        throw new errors.Forbidden(`The storage name '${this._storageKey}' is already in use by another instance.`)
      }
    }
  }

  async ready () {
    const keys = Object.keys(this.store)
    await Promise.all(
      keys.map(key => {
        let id = this.store[key][this.id]
        id = this.setMax(id)
        return this.getModel().setItem(String(id), this.store[key])
      })
    )
  }

  getModel () {
    return this._storage
  }

  async getEntries (params = {}) {
    debug(`getEntries(${JSON.stringify(params)})` + this._debugSuffix)
    return this._find({ ...params, paginate: false })
      .then(select(params, this.id))
      .then(stringsToDates(this._dates))
  }

  getQuery (params) {
    const options = this.getOptions(params)
    const { $skip, $sort, $limit, $select, ...query } = params.query || {}
    return {
      query,
      filters: { $skip, $sort, $limit: getLimit($limit, options.paginate), $select }
    }
  }

  setMax (id) {
    if (Number.isInteger(id)) {
      this._id = Math.max(Number.parseInt(id), this._id)
    }
    return id
  }

  async _find (params = {}) {
    debug(`_find(${JSON.stringify(params)})` + this._debugSuffix)
    if (!this._ready) this._ready = this.ready()
    await this._ready
    const { paginate } = this.getOptions(params)
    const { query, filters } = this.getQuery(params)

    const asyncFilter = async (arr, predicate) => {
      const results = await Promise.all(arr.map(predicate))
      return arr.filter((_v, index) => results[index])
    }

    let keys = await this.getModel().keys()
    keys = await asyncFilter(keys, async key => {
      const item = await this.getModel().getItem(key)
      return this.options.matcher(query)(item)
    })

    let values = await Promise.all(keys.map(key => this.getModel().getItem(key)))
    const total = values.length

    if (filters.$sort !== undefined) {
      values.sort(this.options.sorter(filters.$sort))
    }
    if (filters.$skip !== undefined) {
      values = values.slice(filters.$skip)
    }
    if (filters.$limit !== undefined) {
      values = values.slice(0, filters.$limit)
    }

    values = stringsToDates(this._dates)(values)

    const result = {
      total,
      limit: filters.$limit,
      skip: filters.$skip || 0,
      data: values.map(value => _select(value, params, this.id))
    }

    if (!(paginate && paginate.default)) {
      debug(`_find res = ${JSON.stringify(result.data)}`)
      return result.data
    }

    debug(`_find res = ${JSON.stringify(result)}`)
    return result
  }

  async _get (id, params = {}) {
    debug(`_get(${id}, ${JSON.stringify(params)})` + this._debugSuffix)
    if (!this._ready) this._ready = this.ready()
    await this._ready
    const { query } = this.getQuery(params)
    return this.getModel().getItem(String(id), null)
      .catch(err => { throw new errors.NotFound(`No record found for ${this.id} '${id}', err=${err.name} ${err.message}` + this._debugSuffix) })
      .then(item => {
        if (item === null) throw new errors.NotFound(`No match for ${this.id} = '${id}', query=${JSON.stringify(query)}` + this._debugSuffix)
        if (this.options.matcher(query)(item)) return item
        throw new errors.NotFound(`No match for item = ${JSON.stringify(item)}, query=${JSON.stringify(query)}` + this._debugSuffix)
      })
      .then(select(params, this.id))
      .then(stringsToDates(this._dates))
  }

  async _findOrGet (id, params = {}) {
    debug(`_findOrGet(${id}, ${JSON.stringify(params)})` + this._debugSuffix)
    if (id === null) {
      return this._find(_.extend({}, params, { paginate: false }))
    }
    return this._get(id, params)
  }

  async _create (raw, params = {}) {
    if (Array.isArray(raw) && !this.allowsMulti('create', params)) {
      throw new errors.MethodNotAllowed('Can not create multiple entries')
    }
    debug(`_create(${JSON.stringify(raw)}, ${JSON.stringify(params)})` + this._debugSuffix)

    const addId = item => {
      const thisId = item[this.id]
      item[this.id] = thisId !== undefined ? this.setMax(thisId) : ++this._id
      return item
    }

    const data = Array.isArray(raw)
      ? raw.map(item => addId(Object.assign({}, item)))
      : addId(Object.assign({}, raw))

    const addItemId = (!Object.prototype.hasOwnProperty.call(params, 'addId') || params.addId)

    const doOne = (item, indexOrData) => {
      const originalItem = (typeof indexOrData === 'object' ? indexOrData : raw[indexOrData])
      const hadId = (originalItem[this.id] !== undefined)
      const stored = addItemId || hadId ? item : _.omit(item, [this.id])
      return this.getModel().setItem(String(item[this.id]), stored, null)
        .then(() => stored)
        .then(select(params, this.id))
        .then(stringsToDates(this._dates))
        .catch(err => {
          throw new errors.GeneralError(`_create doOne: ERROR: err=${err.name}, ${err.message}`)
        })
    }

    return Array.isArray(data) ? Promise.all(data.map(doOne)) : doOne(data, raw)
  }

  async _patch (id, data, params = {}) {
    if (id === null && !this.allowsMulti('patch', params)) {
      throw new errors.MethodNotAllowed('Can not patch multiple entries')
    }
    debug(`_patch(${id}, ${JSON.stringify(data)}, ${JSON.stringify(params)})` + this._debugSuffix)

    const items = await this._findOrGet(id, params)

    if (params.upsert) {
      if (Array.isArray(items) && items.length === 0) return this._create(data)
      if (!items) return this._create(data)
    }

    const patchEntry = async entry => {
      const currentId = entry[this.id]
      const item = _.extend(entry, _.omit(data, this.id))
      await this.getModel().setItem(String(currentId), item, null)
      return stringsToDates(this._dates)(_select(item, params, this.id))
    }

    return Array.isArray(items)
      ? Promise.all(items.map(patchEntry))
      : patchEntry(items)
  }

  async _update (id, data, params = {}) {
    if (id === null || Array.isArray(data)) {
      throw new errors.BadRequest("You can not replace multiple instances. Did you mean 'patch'?")
    }
    debug(`_update(${id}, ${JSON.stringify(data)}, ${JSON.stringify(params)})` + this._debugSuffix)

    const item = await this._findOrGet(id, params)

    if (params.upsert) {
      if (Array.isArray(item) && item.length === 0) return this._create(data)
      if (!item) return this._create(data)
    }

    const entry = _.omit(data, this.id)
    entry[this.id] = item[this.id]

    return this.getModel().setItem(String(entry[this.id]), entry, null)
      .then(() => entry)
      .then(select(params, this.id))
      .then(stringsToDates(this._dates))
  }

  async __removeItem (item) {
    await this.getModel().removeItem(String(item[this.id]), null)
    return item
  }

  async _remove (id, params = {}) {
    if (id === null && !this.allowsMulti('remove', params)) {
      throw new errors.MethodNotAllowed('Can not remove multiple entries')
    }
    debug(`_remove(${id}, ${JSON.stringify(params)})` + this._debugSuffix)

    const items = await this._findOrGet(id, params)

    if (Array.isArray(items)) {
      return Promise.all(items.map(item => this.__removeItem(item)))
        .then(select(params, this.id))
    }
    return this.__removeItem(items)
      .then(select(params, this.id))
  }
}
