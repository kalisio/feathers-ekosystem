---
title: Client API
description: Client-side utilities for web push notifications
---

# Client

## checkPrerequisites()

Checks whether the current browser supports the required APIs for push notifications.

It verifies:
- The **Push API** (`PushManager`)
- The **Notifications API** (`Notification`)

### Throws

| Type | Description |
|------|-------------|
| `NotificationsNotSupported` (498) | If the browser does not support push notifications or the Notifications API. |

## requestNotificationPermission()

Requests the user's permission to display notifications.

If the current permission state is `default`, the browser prompts the user to grant or deny permission.

### Returns

| Type | Description |
|------|-------------|
| `Promise<string>` | Resolves to the updated permission state: `"granted"`, `"denied"`, or `"default"`. |

### Throws

| Type | Description |
|------|-------------|
| `PermissionDeniedNotifications` (499) | If permission is denied (either previously or during the request). |

## getPushSubscription()

Retrieves the current push subscription from the registered service worker.

### Returns

| Type | Description |
|------|-------------|
| `Promise<PushSubscription|null>` | Resolves to the current `PushSubscription` object, or `null` if no subscription exists. |

### Throws

| Type | Description |
|------|-------------|
| `ServiceWorkerNotRegistered` (497) | If no service worker is registered. |

## subscribePushNotifications(publicVapidKey)

Subscribes the user to push notifications using the provided VAPID public key.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `publicVapidKey` | `Uint8Array` \| `string` | yes | The application’s public VAPID key. |

### Returns

| Type | Description |
|------|-------------|
| `Promise<Object>` | Resolves to a serializable push subscription object. |

## unsubscribePushNotifications()

Unsubscribes the current push subscription.

### Returns

| Type | Description |
|------|-------------|
| `Promise<PushSubscription>` | Resolves to the unsubscribed `PushSubscription` object. |

## addSubscription(subscription, currentSubscription, subscriptionProperty)

Adds a push subscription to a subscription container object if it does not already exist.

If the subscription already exists (same `endpoint`), it is not duplicated.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `subscription` | `Object` | yes | The object containing subscriptions. |
| `currentSubscription` | `Object` | yes | The subscription to add. |
| `subscriptionProperty` | `string` | yes | The property name that stores subscriptions. |

### Returns

| Type | Description |
|------|-------------|
| `Array` | The updated array of subscriptions. |

## removeSubscription(subscription, currentSubscription, subscriptionProperty)

Removes a push subscription from a subscription container object.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `subscription` | `Object` | yes | The object containing subscriptions. |
| `currentSubscription` | `Object` | yes | The subscription to remove. |
| `subscriptionProperty` | `string` | yes | The property name that stores subscriptions. |

### Returns

| Type | Description |
|------|-------------|
| `Object` | The updated subscription object. |