import _ from 'lodash'
import makeDebug from 'debug'

const debug = makeDebug('feathers-webpush:hooks')

export async function deleteExpiredSubscriptions (hook) {
  if (hook.type !== 'after') {
    throw new Error('The \'deleteExpiredSubscriptions\' hook should only be used as a \'after\' hook.')
  }
  const app = hook.app
  const subscriptionService = hook.result.subscriptionService
  const errors = _.filter(hook.result.failed, error => (error.statusCode === 410 || error.statusCode === 404))
  const subscriptionProperty = hook.result.subscriptionProperty
  const subscriptions = await app.service(subscriptionService).find({ paginate: false })
  for (const error of errors) {
    for (const subscription of subscriptions) {
      if (_.find(_.get(subscription, subscriptionProperty), sub => sub.endpoint === error.endpoint)) {
        // Patch subscriptions
        _.set(subscription, subscriptionProperty, _.filter(_.get(subscription, subscriptionProperty, []), subscription => subscription.endpoint !== error.endpoint))
        const newSubscriptionProperty = {}
        newSubscriptionProperty[subscriptionProperty] = _.get(subscription, subscriptionProperty)
        await app.service(subscriptionService).patch(subscription._id, newSubscriptionProperty)
        debug(`Delete subscription with endpoint ${error.endpoint}`)
      }
    }
  }
  return hook
}
