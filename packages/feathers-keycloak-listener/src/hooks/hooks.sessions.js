import _ from 'lodash'
import createDebug from 'debug'
const debug = createDebug('feathers-keycloak-listener:contexts:sessions')

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
