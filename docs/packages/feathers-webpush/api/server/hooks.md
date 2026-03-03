---
title: hooks
---

# Hooks

## deleteExpiredSubscriptions

### Signature

```js
deleteExpiredSubscriptions(hook)
```

### Description

After hook that automatically removes expired web push subscriptions
from a Feathers service after a notification delivery attempt.

The hook inspects `hook.result.failed` and looks for failed push attempts
with HTTP status codes `410` (Gone) or `404` (Not Found).

For each matching error, it:

- Retrieves all records from the configured subscription service
- Finds subscriptions matching the failed `endpoint`
- Removes the expired subscription from the record
- Patches the record in the database
- Logs the deletion using `debug`

This hook must be registered as an **after** hook.

### Parameters

| Name   | Type   | Required | Description                                      |
|--------|--------|----------|--------------------------------------------------|
| `hook` | object | yes      | The FeathersJS hook context. Must be an after hook. |

The hook expects the following properties inside `hook.result`:

| Name                   | Type   | Required | Description                                                  |
|------------------------|--------|----------|--------------------------------------------------------------|
| `failed`               | array  | yes      | Array of failed push attempts (`statusCode`, `endpoint`).   |
| `subscriptionService`  | string | yes      | Name of the Feathers service storing subscriptions.         |
| `subscriptionProperty` | string | yes      | Property name containing the subscriptions array.           |

### Returns

| Type              | Description                |
|-------------------|----------------------------|
| `Promise<object>` | The original hook context. |

### Throws

| Type  | Description                                      |
|-------|--------------------------------------------------|
| `Error` | If the hook is not used as an `after` hook. |

### Examples

```js
import { deleteExpiredSubscriptions } from '@kalisio/feathers-webpush/server'

app.service('push').hooks({
  after: {
    create: [deleteExpiredSubscriptions]
  }
})
```
