import _ from 'lodash'
import createDebug from 'debug'

const debug = createDebug('feathers-keycloak-listener:hooks:users')

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
