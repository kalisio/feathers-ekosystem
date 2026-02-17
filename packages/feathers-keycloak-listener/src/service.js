import createDebug from 'debug'
import { BadRequest } from '@feathersjs/errors'

const debug = createDebug('feathers-keycloak-listener:service')

export class Service {
  constructor (options) {
    this.usersServicePath = options?.usersServicePath || 'users'
  }

  async create (data, params) {
    if (!data.eventClass) throw new BadRequest('create: missing \'data.eventClass\'')

    if (data.eventClass === 'AdminEvent') {
      debug('method \'create\' called with \'Admin\' event')
      // Define the eventType
      const operationType = data.operationType // e.g. 'CREATE'
      const resourceType = data.resourceType // e.g. 'USER'
      data.eventType = data.eventClass + '.' + operationType + '.' + resourceType
    } else {
      // User event
      debug('method \'create\' called with \'User\' event')
      data.eventType = data.eventClass + '.' + data.type
    }

    return { success: true }
  }
}
