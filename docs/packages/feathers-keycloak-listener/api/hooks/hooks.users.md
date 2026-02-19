---
title: hooks.users
---

# users

## createUser

### Signature

```js
createUser(context)
```

### Description

After hook that creates a local user document when a Keycloak admin creates a new user.

Listens for Keycloak admin events of type `AdminEvent.CREATE.USER`. When triggered,
it extracts the Keycloak user ID from `event.resourcePath` and creates a new document
in the users service, merging `keycloakId`, `name`, and all properties from `event.value`.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `context` | object | yes | The FeathersJS hook context. |

### Returns

| Type | Description |
|------|-------------|
| `Promise<object>` | The hook context, unmodified if the event type is not `AdminEvent.CREATE.USER`. |

### Examples

```js
import { createUser } from './hooks/users'

app.service('keycloak-events').hooks({
  after: {
    create: [createUser]
  }
})
```

## updateUser

### Signature

```js
updateUser(context)
```

### Description

After hook that updates a local user document when a Keycloak admin updates a user.

Listens for Keycloak admin events of type `AdminEvent.UPDATE.USER`. When triggered,
it looks up the user by their `keycloakId` and patches their document with the
properties from `event.value`.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `context` | object | yes | The FeathersJS hook context. |

### Returns

| Type | Description |
|------|-------------|
| `Promise<object>` | The hook context, unmodified if the event type is not `AdminEvent.UPDATE.USER`. |

### Examples

```js
import { updateUser } from './hooks/users'

app.service('keycloak-events').hooks({
  after: {
    create: [updateUser]
  }
})
```

## deleteUser

### Signature

```js
deleteUser(context)
```

### Description

After hook that removes a local user document when a Keycloak admin deletes a user.

Listens for Keycloak admin events of type `AdminEvent.DELETE.USER`. When triggered,
it looks up the user by their `keycloakId` and removes their document from the
users service.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `context` | object | yes | The FeathersJS hook context. |

### Returns

| Type | Description |
|------|-------------|
| `Promise<object>` | The hook context, unmodified if the event type is not `AdminEvent.DELETE.USER`. |

### Examples

```js
import { deleteUser } from './hooks/users'

app.service('keycloak-events').hooks({
  after: {
    create: [deleteUser]
  }
})
```

