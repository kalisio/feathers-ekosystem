---
title: Service
---

# Service

## Service

### Signature

```js
new Service(options)
```

### Description

A Feathers service for sending web push notifications to subscribed users.

This service retrieves subscriptions from a specified Feathers service,
validates them, and sends notifications using the `web-push` library.
It handles successful and failed deliveries and logs relevant debug information.

### Constructor Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | object | yes | Configuration object for the service. |
| `options.app` | object | yes | The Feathers application instance. |
| `options.vapidDetails` | object | yes | VAPID key details for sending push notifications. Must contain `subject`, `publicKey`, and `privateKey`. |

### Throws (constructor)

| Type | Description |
|------|-------------|
| `Error` | If `options`, `options.app`, or `options.vapidDetails` are missing. |

---

## create

### Signature

```js
service.create(data, params)
```

### Description

Sends a web push notification to all subscriptions retrieved from the specified service.

Steps:

1. Validates the required parameters in `data`:
   - `notification`
   - `subscriptionService`
   - `subscriptionProperty`
2. Retrieves subscriptions from the specified service using an optional `subscriptionFilter`.
3. Iterates over each subscription, validates the subscription keys (`endpoint`, `keys.auth`, `keys.p256dh`).
4. Sends the notification using `web-push.sendNotification`.
5. Returns an object containing arrays of successful and failed deliveries.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `data` | object | yes | Data for sending the notification. |
| `data.notification` | object | yes | The notification payload. |
| `data.subscriptionService` | string | yes | Name of the Feathers service storing subscriptions. |
| `data.subscriptionProperty` | string | yes | Property containing subscriptions in the service. |
| `data.subscriptionFilter` | object | no | Optional filter/query for retrieving subscriptions. |
| `params` | object | no | FeathersJS service call params. |

### Returns

| Type | Description |
|------|-------------|
| `Promise<object>` | An object containing: <br> - `succesful`: array of successful notifications <br> - `failed`: array of errors <br> - `subscriptionService` and `subscriptionProperty` used. |

### Throws (create)

| Type | Description |
|------|-------------|
| `BadRequest` | If required `data` parameters are missing or if subscription object is invalid. |

### Examples

```js
import { Service } from '@kalisio/feathers-webpush/server'

const pushService = new Service({
  app,
  vapidDetails: {
    subject: 'mailto:admin@example.com',
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
  }
})

const result = await pushService.create({
  notification: { title: 'Hello!', body: 'Test notification' },
  subscriptionService: 'users',
  subscriptionProperty: 'subscriptions'
})

console.log(result.succesful, result.failed)
```