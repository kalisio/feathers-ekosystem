import _ from 'lodash'
import createDebug from 'debug'
const debug = createDebug('feathers-keycloak-listener:hooks:sessions')

export async function setSession (hook) {
  if (hook.type !== 'after') {
    throw new Error('The \'setSession\' hook should only be used as a \'after\' hook.')
  }
  // Retrieve the KC event
  const event = hook.data
  // Skip the KC event if it does not have the correct type
  if (event.eventType !== 'Event.LOGIN') return hook
  // Retrieve the user
  const keycloakId = event.userId
  debug(`'deleteUser' called with keycloakId '${keycloakId}'`)
  const usersService = hook.app.service(hook.service.usersServicePath)
  const response = await usersService.find({ query: { keycloakId } })
  const user = _.get(response, 'data[0]')
  // Delete the user
  if (user) {
    await usersService.patch(user._id, { session: _.omit(event, ['type', 'username', 'error', 'userId']) })
  } else {
    throw new Error(`Cannot find user with keycloadId '${keycloakId}'`)
  }
  return hook
}

export async function unsetSession (hook) {
  if (hook.type !== 'after') {
    throw new Error('The \'unsetSession\' hook should only be used as a \'after\' hook.')
  }
  // Retrieve the KC event
  const event = hook.data
  // Skip the KC event if it does not have the correct type
  if (event.eventType !== 'Event.LOGOUT') return hook
  // Retrieve the user
  const keycloakId = event.userId
  debug(`'deleteUser' called with keycloakId '${keycloakId}'`)
  const usersService = hook.app.service(hook.service.usersServicePath)
  const response = await usersService.find({ query: { keycloakId } })
  const user = _.get(response, 'data[0]')
  // Delete the user
  if (user) {
    await usersService.patch(user._id, { session: null })
  } else {
    throw new Error(`Cannot find user with keycloadId '${keycloakId}'`)
  }
  return hook
}
