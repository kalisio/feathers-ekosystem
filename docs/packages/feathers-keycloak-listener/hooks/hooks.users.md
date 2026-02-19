---
title: hooks.users
---

# hooks.users

## createUser

### Signature

```javascript
createUser(hook, hook.type, hook.data, hook.data.eventType, hook.data.resourcePath, hook.data.value, hook.app, hook.service, hook.service.usersServicePath)
```

### Description

After hook that creates a local user document when a Keycloak admin creates a new user.

Listens for Keycloak admin events of type `AdminEvent.CREATE.USER`. When triggered,
it extracts the Keycloak user ID from `event.resourcePath` and creates a new document
in the users service, merging `keycloakId`, `name`, and all properties from `event.value`.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| hook | object | yes | The FeathersJS hook context. |
| hook.type | `after` | yes | Must be `after`. |
| hook.data | object | yes | The Keycloak admin event object. |
| hook.data.eventType | string | yes | The Keycloak event type. Only `AdminEvent.CREATE.USER` is processed. |
| hook.data.resourcePath | string | yes | Resource path containing the Keycloak user ID (e.g. `users/<keycloakId>`). |
| hook.data.value | object | yes | The Keycloak user payload (must include at least `username`). |
| hook.app | object | yes | The FeathersJS application instance. |
| hook.service | object | yes | The service that triggered the hook. |
| hook.service.usersServicePath | string | yes | Path to the users service (e.g. `users`). |

### Returns

| Type | Description |
|------|-------------|
| Promise.<object>; | The hook context, unmodified if the event type is not `AdminEvent.CREATE.USER`. |

### Examples

```javascript
import { createUser } from './hooks/users'

app.service('keycloak-events').hooks({
  after: {
    create: [createUser]
  }
})
```

## updateUser

### Signature

```javascript
updateUser(hook, hook.type, hook.data, hook.data.eventType, hook.data.resourcePath, hook.data.value, hook.app, hook.service, hook.service.usersServicePath)
```

### Description

After hook that updates a local user document when a Keycloak admin updates a user.

Listens for Keycloak admin events of type `AdminEvent.UPDATE.USER`. When triggered,
it looks up the user by their `keycloakId` and patches their document with the
properties from `event.value`.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| hook | object | yes | The FeathersJS hook context. |
| hook.type | `after` | yes | Must be `after`. |
| hook.data | object | yes | The Keycloak admin event object. |
| hook.data.eventType | string | yes | The Keycloak event type. Only `AdminEvent.UPDATE.USER` is processed. |
| hook.data.resourcePath | string | yes | Resource path containing the Keycloak user ID (e.g. `users/<keycloakId>`). |
| hook.data.value | object | yes | The updated Keycloak user payload to patch onto the local document. |
| hook.app | object | yes | The FeathersJS application instance. |
| hook.service | object | yes | The service that triggered the hook. |
| hook.service.usersServicePath | string | yes | Path to the users service (e.g. `users`). |

### Returns

| Type | Description |
|------|-------------|
| Promise.<object>; | The hook context, unmodified if the event type is not `AdminEvent.UPDATE.USER`. |

### Examples

```javascript
import { updateUser } from './hooks/users'

app.service('keycloak-events').hooks({
  after: {
    create: [updateUser]
  }
})
```

## deleteUser

### Signature

```javascript
deleteUser(hook, hook.type, hook.data, hook.data.eventType, hook.data.resourcePath, hook.app, hook.service, hook.service.usersServicePath)
```

### Description

After hook that removes a local user document when a Keycloak admin deletes a user.

Listens for Keycloak admin events of type `AdminEvent.DELETE.USER`. When triggered,
it looks up the user by their `keycloakId` and removes their document from the
users service.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| hook | object | yes | The FeathersJS hook context. |
| hook.type | `after` | yes | Must be `after`. |
| hook.data | object | yes | The Keycloak admin event object. |
| hook.data.eventType | string | yes | The Keycloak event type. Only `AdminEvent.DELETE.USER` is processed. |
| hook.data.resourcePath | string | yes | Resource path containing the Keycloak user ID (e.g. `users/<keycloakId>`). |
| hook.app | object | yes | The FeathersJS application instance. |
| hook.service | object | yes | The service that triggered the hook. |
| hook.service.usersServicePath | string | yes | Path to the users service (e.g. `users`). |

### Returns

| Type | Description |
|------|-------------|
| Promise.<object>; | The hook context, unmodified if the event type is not `AdminEvent.DELETE.USER`. |

### Examples

```javascript
import { deleteUser } from './hooks/users'

app.service('keycloak-events').hooks({
  after: {
    create: [deleteUser]
  }
})
```

