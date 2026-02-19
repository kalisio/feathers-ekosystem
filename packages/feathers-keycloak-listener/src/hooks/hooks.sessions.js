import _ from 'lodash'
import createDebug from 'debug'
const debug = createDebug('feathers-keycloak-listener:contexts:sessions')

/**
 * After context that stores Keycloak session data on the matching user document upon login.
 *
 * Listens for Keycloak events of type `Event.LOGIN`. When triggered, it looks up
 * the user by their `keycloakId` and patches their document with a `session` field
 * containing the relevant event data.
 *
 * @async
 * @function setSession
 * @param {object} context - The FeathersJS context context.
 * @param {'after'} context.type - Must be `'after'`.
 * @param {object} context.data - The Keycloak event object.
 * @param {string} context.data.eventType - The Keycloak event type. Only `'Event.LOGIN'` is processed.
 * @param {string} context.data.userId - The Keycloak user ID used to look up the local user.
 * @param {object} context.app - The FeathersJS application instance.
 * @param {object} context.service - The service that triggered the context.
 * @param {string} context.service.usersServicePath - Path to the users service (e.g. `'users'`).
 * @returns {Promise<object>} The context context, unmodified if the event type is not `Event.LOGIN`.
 * @throws {Error} If the context is not used as an `after` context.
 * @throws {Error} If no user is found matching the provided `keycloakId`.
 *
 * @example
 * import { setSession } from './contexts/sessions'
 *
 * app.service('keycloak-events').contexts({
 *   after: {
 *     create: [setSession]
 *   }
 * })
 */
export async function setSession (context) {
  if (context.type !== 'after') {
    throw new Error('The \'setSession\' context should only be used as a \'after\' context.')
  }
  // Retrieve the KC event
  const event = context.data
  // Skip the KC event if it does not have the correct type
  if (event.eventType !== 'Event.LOGIN') return context
  // Retrieve the user
  const keycloakId = event.userId
  debug(`'deleteUser' called with keycloakId '${keycloakId}'`)
  const usersService = context.app.service(context.service.usersServicePath)
  const response = await usersService.find({ query: { keycloakId } })
  const user = _.get(response, 'data[0]')
  // Delete the user
  if (user) {
    await usersService.patch(user._id, { session: _.omit(event, ['type', 'username', 'error', 'userId']) })
  } else {
    throw new Error(`Cannot find user with keycloadId '${keycloakId}'`)
  }
  return context
}

/**
 * After hook that clears the session data on the matching user document upon logout.
 *
 * Listens for Keycloak events of type `Event.LOGOUT`. When triggered, it looks up
 * the user by their `keycloakId` and patches their document by setting the `session`
 * field to `null`.
 *
 * @async
 * @function unsetSession
 * @param {object} hook - The FeathersJS hook context.
 * @param {'after'} hook.type - Must be `'after'`.
 * @param {object} hook.data - The Keycloak event object.
 * @param {string} hook.data.eventType - The Keycloak event type. Only `'Event.LOGOUT'` is processed.
 * @param {string} hook.data.userId - The Keycloak user ID used to look up the local user.
 * @param {object} hook.app - The FeathersJS application instance.
 * @param {object} hook.service - The service that triggered the hook.
 * @param {string} hook.service.usersServicePath - Path to the users service (e.g. `'users'`).
 * @returns {Promise<object>} The hook context, unmodified if the event type is not `Event.LOGOUT`.
 * @throws {Error} If the hook is not used as an `after` hook.
 * @throws {Error} If no user is found matching the provided `keycloakId`.
 *
 * @example
 * import { unsetSession } from './hooks/sessions'
 *
 * app.service('keycloak-events').hooks({
 *   after: {
 *     create: [unsetSession]
 *   }
 * })
 */
export async function unsetSession (context) {
  if (context.type !== 'after') {
    throw new Error('The \'unsetSession\' context should only be used as a \'after\' context.')
  }
  // Retrieve the KC event
  const event = context.data
  // Skip the KC event if it does not have the correct type
  if (event.eventType !== 'Event.LOGOUT') return context
  // Retrieve the user
  const keycloakId = event.userId
  debug(`'deleteUser' called with keycloakId '${keycloakId}'`)
  const usersService = context.app.service(context.service.usersServicePath)
  const response = await usersService.find({ query: { keycloakId } })
  const user = _.get(response, 'data[0]')
  // Delete the user
  if (user) {
    await usersService.patch(user._id, { session: null })
  } else {
    throw new Error(`Cannot find user with keycloadId '${keycloakId}'`)
  }
  return context
}
