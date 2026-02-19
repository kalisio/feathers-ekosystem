import _ from 'lodash'
import createDebug from 'debug'

const debug = createDebug('feathers-keycloak-listener:hooks:users')

/**
 * After hook that creates a local user document when a Keycloak admin creates a new user.
 *
 * Listens for Keycloak admin events of type `AdminEvent.CREATE.USER`. When triggered,
 * it extracts the Keycloak user ID from `event.resourcePath` and creates a new document
 * in the users service, merging `keycloakId`, `name`, and all properties from `event.value`.
 *
 * @async
 * @function createUser
 * @param {object} hook - The FeathersJS hook context.
 * @param {'after'} hook.type - Must be `after`.
 * @param {object} hook.data - The Keycloak admin event object.
 * @param {string} hook.data.eventType - The Keycloak event type. Only `AdminEvent.CREATE.USER` is processed.
 * @param {string} hook.data.resourcePath - Resource path containing the Keycloak user ID (e.g. `users/<keycloakId>`).
 * @param {object} hook.data.value - The Keycloak user payload (must include at least `username`).
 * @param {object} hook.app - The FeathersJS application instance.
 * @param {object} hook.service - The service that triggered the hook.
 * @param {string} hook.service.usersServicePath - Path to the users service (e.g. `users`).
 * @returns {Promise<object>} The hook context, unmodified if the event type is not `AdminEvent.CREATE.USER`.
 * @throws {Error} If the hook is not used as an `after` hook.
 * @throws {Error} If `event.resourcePath` is missing.
 * @throws {Error} If `event.value` is missing.
 *
 * @example
 * import { createUser } from './hooks/users'
 *
 * app.service('keycloak-events').hooks({
 *   after: {
 *     create: [createUser]
 *   }
 * })
 */
export async function createUser (hook) {
  if (hook.type !== 'after') {
    throw new Error('\'createUser\' hook should only be used as a \'after\' hook.')
  }
  // Retrieve the KC event
  const event = hook.data
  // Skip the KC event if it does not have the correct type
  if (event.eventType !== 'AdminEvent.CREATE.USER') return hook
  // Check the KC event
  if (!event.resourcePath) throw new Error('\'createUser\' hook: missing \'resourcePath\'')
  if (!event.value) throw new Error('\'createUser\' hook: missing \'value\'')
  debug('\'createUser\' called')
  // Create the user
  const keycloakId = event.resourcePath.substr(6)
  const name = _.get(event, 'value.username')
  debug(`createUser' called for ${name} with keycloak Id '${keycloakId}`)
  const usersService = hook.app.service(hook.service.usersServicePath)
  await usersService.create(Object.assign({ keycloakId, name }, event.value))
  return hook
}

/**
 * After hook that updates a local user document when a Keycloak admin updates a user.
 *
 * Listens for Keycloak admin events of type `AdminEvent.UPDATE.USER`. When triggered,
 * it looks up the user by their `keycloakId` and patches their document with the
 * properties from `event.value`.
 *
 * @async
 * @function updateUser
 * @param {object} hook - The FeathersJS hook context.
 * @param {'after'} hook.type - Must be `after`.
 * @param {object} hook.data - The Keycloak admin event object.
 * @param {string} hook.data.eventType - The Keycloak event type. Only `AdminEvent.UPDATE.USER` is processed.
 * @param {string} hook.data.resourcePath - Resource path containing the Keycloak user ID (e.g. `users/<keycloakId>`).
 * @param {object} hook.data.value - The updated Keycloak user payload to patch onto the local document.
 * @param {object} hook.app - The FeathersJS application instance.
 * @param {object} hook.service - The service that triggered the hook.
 * @param {string} hook.service.usersServicePath - Path to the users service (e.g. `users`).
 * @returns {Promise<object>} The hook context, unmodified if the event type is not `AdminEvent.UPDATE.USER`.
 * @throws {Error} If the hook is not used as an `after` hook.
 * @throws {Error} If `event.resourcePath` is missing.
 * @throws {Error} If `event.value` is missing.
 * @throws {Error} If no user is found matching the provided `keycloakId`.
 *
 * @example
 * import { updateUser } from './hooks/users'
 *
 * app.service('keycloak-events').hooks({
 *   after: {
 *     create: [updateUser]
 *   }
 * })
 */
export async function updateUser (hook) {
  if (hook.type !== 'after') {
    throw new Error('The \'updateUser\' hook should only be used as a \'after\' hook')
  }
  // Retrieve the KC event
  const event = hook.data
  // Skip the KC event if it does not have the correct type
  if (event.eventType !== 'AdminEvent.UPDATE.USER') return hook
  // Check the KC event
  if (!event.resourcePath) throw new Error('\'createUser\' hook: missing \'resourcePath\'')
  if (!event.value) throw new Error('\'createUser\' hook: missing \'value\'')
  // Retrieve the user
  const keycloakId = event.resourcePath.substr(6)
  debug(`'updateUser' called with keycloakId '${keycloakId}`)
  const usersService = hook.app.service(hook.service.usersServicePath)
  const response = await usersService.find({ query: { keycloakId } })
  const user = _.get(response, 'data[0]')
  // Patch the user
  if (user) {
    await usersService.patch(user._id, event.value)
  } else {
    throw new Error(`Cannot find user with keycloadId '${keycloakId}`)
  }
  return hook
}

/**
 * After hook that removes a local user document when a Keycloak admin deletes a user.
 *
 * Listens for Keycloak admin events of type `AdminEvent.DELETE.USER`. When triggered,
 * it looks up the user by their `keycloakId` and removes their document from the
 * users service.
 *
 * @async
 * @function deleteUser
 * @param {object} hook - The FeathersJS hook context.
 * @param {'after'} hook.type - Must be `after`.
 * @param {object} hook.data - The Keycloak admin event object.
 * @param {string} hook.data.eventType - The Keycloak event type. Only `AdminEvent.DELETE.USER` is processed.
 * @param {string} hook.data.resourcePath - Resource path containing the Keycloak user ID (e.g. `users/<keycloakId>`).
 * @param {object} hook.app - The FeathersJS application instance.
 * @param {object} hook.service - The service that triggered the hook.
 * @param {string} hook.service.usersServicePath - Path to the users service (e.g. `users`).
 * @returns {Promise<object>} The hook context, unmodified if the event type is not `AdminEvent.DELETE.USER`.
 * @throws {Error} If the hook is not used as an `after` hook.
 * @throws {Error} If `event.resourcePath` is missing.
 * @throws {Error} If no user is found matching the provided `keycloakId`.
 *
 * @example
 * import { deleteUser } from './hooks/users'
 *
 * app.service('keycloak-events').hooks({
 *   after: {
 *     create: [deleteUser]
 *   }
 * })
 */
export async function deleteUser (hook) {
  if (hook.type !== 'after') {
    throw new Error('The \'createUser\' hook should only be used as a \'after\' hook')
  }
  // Retrieve the KC event
  const event = hook.data
  // Skip the KC event if it does not have the correct type
  if (event.eventType !== 'AdminEvent.DELETE.USER') return hook
  // Check the KC event
  if (!event.resourcePath) throw new Error('\'createUser\' hook: missing \'resourcePath\'')
  // Retrieve the user
  const keycloakId = event.resourcePath.substr(6)
  debug(`'deleteUser' called with keycloakId '${keycloakId}`)
  const usersService = hook.app.service(hook.service.usersServicePath)
  const response = await usersService.find({ query: { keycloakId } })
  const user = _.get(response, 'data[0]')
  // Delete the user
  if (user) {
    await usersService.remove(user._id)
  } else {
    throw new Error(`Cannot find user with keycloadId '${keycloakId}`)
  }
  return hook
}
