---
title: contexts.sessions
---

# sessions

## setSession

### Signature

```js
setSession(context)
```

### Description

After hook that stores Keycloak session data on the matching user document upon login.

Listens for Keycloak events of type `Event.LOGIN`. When triggered, it looks up
the user by their `keycloakId` and patches their document with a `session` field
containing the relevant event data.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `context` | object | yes | The FeathersJS hook context. |

### Returns

| Type | Description |
|------|-------------|
| `Promise<object>` | The hook context, unmodified if the event type is not `Event.LOGIN`. |

### Examples

```js
import { setSession } from './hooks/sessions'

app.service('keycloak-events').hooks({
  after: {
    create: [setSession]
  }
})
```

## unsetSession

### Signature

```js
unsetSession(context)
```

### Description

After hook that clears the session data on the matching user document upon logout.

Listens for Keycloak events of type `Event.LOGOUT`. When triggered, it looks up
the user by their `keycloakId` and patches their document by setting the `session`
field to `null`.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `context` | object | yes | The FeathersJS hook context. |

### Returns

| Type | Description |
|------|-------------|
| `Promise<object>` | The hook context, unmodified if the event type is not `Event.LOGOUT`. |

### Examples

```js
import { unsetSession } from './hooks/sessions'

app.service('keycloak-events').hooks({
  after: {
    create: [unsetSession]
  }
})
```
