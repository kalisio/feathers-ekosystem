import createDebug from 'debug'
import { BadRequest } from '@feathersjs/errors'

const debug = createDebug('feathers-keycloak-listener:service')

/**
 * FeathersJS service that normalizes incoming Keycloak events by computing
 * a unified `eventType` string, which downstream hooks (e.g. `createUser`,
 * `setSession`) use to route their logic.
 *
 * @class Service
 *
 * @example
 * import { Service } from './services/keycloak-events'
 *
 * app.use('keycloak-events', new Service({ usersServicePath: 'users' }))
 */
export class Service {
  /**
   * Creates an instance of the Keycloak events service.
   *
   * @constructor
   * @param {object} [options={}] - Service configuration options.
   * @param {string} [options.usersServicePath='users'] - Path to the users service.
   *   Exposed as `this.usersServicePath` so that hooks can access it via `hook.service.usersServicePath`.
   */
  constructor (options) {
    this.usersServicePath = options?.usersServicePath || 'users'
  }

  /**
   * Normalizes a Keycloak event by computing and attaching an `eventType` string,
   * then returns a success acknowledgement.
   *
   * The `eventType` is built differently depending on `data.eventClass`:
   * - **AdminEvent** → `AdminEvent.<operationType>.<resourceType>`
   *   (e.g. `AdminEvent.CREATE.USER`)
   * - **User event** → `<eventClass>.<type>`
   *   (e.g. `Event.LOGIN`)
   *
   * After this method runs, registered `after` hooks receive the mutated `data`
   * object (with `eventType` set) and can act on it accordingly.
   *
   * @async
   * @param {object} data - The raw Keycloak event payload.
   * @param {string} data.eventClass - The event class, either `AdminEvent` or a user event class (e.g. `Event`).
   * @param {string} [data.operationType] - The operation type for admin events (e.g. `CREATE`, `UPDATE`, `DELETE`).
   * @param {string} [data.resourceType] - The resource type for admin events (e.g. `USER`).
   * @param {string} [data.type] - The event type for user events (e.g. `LOGIN`, `LOGOUT`).
   * @param {object} params - The FeathersJS service call parameters.
   * @returns {Promise<{ success: boolean }>} Always resolves with `{ success: true }` on success.
   * @throws {BadRequest} If `data.eventClass` is missing.
   *
   * @example
   * // Admin event input
   * await app.service('keycloak-events').create({
   *   eventClass: 'AdminEvent',
   *   operationType: 'CREATE',
   *   resourceType: 'USER',
   *   resourcePath: 'users/abc-123',
   *   value: { username: 'john' }
   * })
   * // → data.eventType is set to 'AdminEvent.CREATE.USER' for after hooks
   *
   * @example
   * // User event input
   * await app.service('keycloak-events').create({
   *   eventClass: 'Event',
   *   type: 'LOGIN',
   *   userId: 'abc-123'
   * })
   * // → data.eventType is set to 'Event.LOGIN' for after hooks
   */
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
