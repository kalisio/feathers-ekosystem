# Client API

## checkPrerequisites()

Checks whether the current browser supports the required APIs for push notifications.

It verifies:
- The **Push API** (`PushManager`)
- The **Notifications API** (`Notification`)

### Throws

- `NotificationsNotSupported` (status code `498`)
  If the browser does not support push notifications or the Notifications API.

## requestNotificationPermission()

Requests the user's permission to display notifications.

If the current permission state is `default`, the browser prompts the user to grant or deny permission.

### Returns

A `Promise` resolving to the updated permission state:
- `"granted"`
- `"denied"`
- `"default"`

### Throws

- `PermissionDeniedNotifications` (status code `499`)
  If permission is denied (either previously or during the request).

## getPushSubscription()

Retrieves the current push subscription from the registered service worker.

### Returns

A `Promise` resolving to:
- The current `PushSubscription` object
- `null` if no subscription exists

### Throws

- `ServiceWorkerNotRegistered` (status code `497`)
  If no service worker is registered.

## subscribePushNotifications(publicVapidKey)

Subscribes the user to push notifications using the provided VAPID public key.

### Parameters

- `publicVapidKey` (`Uint8Array` | `string`)
  The application’s public VAPID key.

### Returns

A `Promise` resolving to a serializable push subscription object.

## unsubscribePushNotifications()

Unsubscribes the current push subscription.

### Returns

A `Promise` resolving to the unsubscribed `PushSubscription` object.

## addSubscription(subscription, currentSubscription, subscriptionProperty)

Adds a push subscription to a subscription container object if it does not already exist.

If the subscription already exists (same `endpoint`), it is not duplicated.

### Parameters

- `subscription` (`Object`) — The object containing subscriptions.
- `currentSubscription` (`Object`) — The subscription to add.
- `subscriptionProperty` (`string`) — The property name that stores subscriptions.

### Returns

The updated subscription collection (see implementation notes).

## removeSubscription(subscription, currentSubscription, subscriptionProperty)

Removes a push subscription from a subscription container object.

### Parameters

- `subscription` (`Object`) — The object containing subscriptions.
- `currentSubscription` (`Object`) — The subscription to remove.
- `subscriptionProperty` (`string`) — The property name that stores subscriptions.

### Returns

The updated subscription object.
