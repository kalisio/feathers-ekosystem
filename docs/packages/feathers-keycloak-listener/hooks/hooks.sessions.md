---
title: hooks.sessions
---

# hooks.sessions


## setSession

### Signature
```javascript
setSession(context, context.type, context.data, context.data.eventType, context.data.userId, context.app, context.service, context.service.usersServicePath)
```

### Description

After context that stores Keycloak session data on the matching user document upon login.

Listens for Keycloak events of type `Event.LOGIN`. When triggered, it looks up
the user by their `keycloakId` and patches their document with a `session` field
containing the relevant event data.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| context | object | yes | The FeathersJS context context. |
| context.type | &#x27;after&#x27; | yes | Must be &#x60;&#x27;after&#x27;&#x60;. |
| context.data | object | yes | The Keycloak event object. |
| context.data.eventType | string | yes | The Keycloak event type. Only &#x60;&#x27;Event.LOGIN&#x27;&#x60; is processed. |
| context.data.userId | string | yes | The Keycloak user ID used to look up the local user. |
| context.app | object | yes | The FeathersJS application instance. |
| context.service | object | yes | The service that triggered the context. |
| context.service.usersServicePath | string | yes | Path to the users service (e.g. &#x60;&#x27;users&#x27;&#x60;). |

### Returns

| Type | Description |
|------|-------------|
| Promise.&lt;object&gt; | The context context, unmodified if the event type is not &#x60;Event.LOGIN&#x60;. |

### Examples

```javascript
import { setSession } from './contexts/sessions'

app.service('keycloak-events').contexts({
  after: {
    create: [setSession]
  }
})
```


---

## unsetSession

### Signature
```javascript
unsetSession(hook, hook.type, hook.data, hook.data.eventType, hook.data.userId, hook.app, hook.service, hook.service.usersServicePath)
```

### Description

After hook that clears the session data on the matching user document upon logout.

Listens for Keycloak events of type `Event.LOGOUT`. When triggered, it looks up
the user by their `keycloakId` and patches their document by setting the `session`
field to `null`.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| hook | object | yes | The FeathersJS hook context. |
| hook.type | &#x27;after&#x27; | yes | Must be &#x60;&#x27;after&#x27;&#x60;. |
| hook.data | object | yes | The Keycloak event object. |
| hook.data.eventType | string | yes | The Keycloak event type. Only &#x60;&#x27;Event.LOGOUT&#x27;&#x60; is processed. |
| hook.data.userId | string | yes | The Keycloak user ID used to look up the local user. |
| hook.app | object | yes | The FeathersJS application instance. |
| hook.service | object | yes | The service that triggered the hook. |
| hook.service.usersServicePath | string | yes | Path to the users service (e.g. &#x60;&#x27;users&#x27;&#x60;). |

### Returns

| Type | Description |
|------|-------------|
| Promise.&lt;object&gt; | The hook context, unmodified if the event type is not &#x60;Event.LOGOUT&#x60;. |

### Examples

```javascript
import { unsetSession } from './hooks/sessions'

app.service('keycloak-events').hooks({
  after: {
    create: [unsetSession]
  }
})
```


---


## setSession

### Signature
```javascript
setSession(context, context.type, context.data, context.data.eventType, context.data.userId, context.app, context.service, context.service.usersServicePath)
```

### Description

After context that stores Keycloak session data on the matching user document upon login.

Listens for Keycloak events of type `Event.LOGIN`. When triggered, it looks up
the user by their `keycloakId` and patches their document with a `session` field
containing the relevant event data.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| context | object | yes | The FeathersJS context context. |
| context.type | &#x27;after&#x27; | yes | Must be &#x60;&#x27;after&#x27;&#x60;. |
| context.data | object | yes | The Keycloak event object. |
| context.data.eventType | string | yes | The Keycloak event type. Only &#x60;&#x27;Event.LOGIN&#x27;&#x60; is processed. |
| context.data.userId | string | yes | The Keycloak user ID used to look up the local user. |
| context.app | object | yes | The FeathersJS application instance. |
| context.service | object | yes | The service that triggered the context. |
| context.service.usersServicePath | string | yes | Path to the users service (e.g. &#x60;&#x27;users&#x27;&#x60;). |

### Returns

| Type | Description |
|------|-------------|
| Promise.&lt;object&gt; | The context context, unmodified if the event type is not &#x60;Event.LOGIN&#x60;. |

### Examples

```javascript
import { setSession } from './contexts/sessions'

app.service('keycloak-events').contexts({
  after: {
    create: [setSession]
  }
})
```


---

## unsetSession

### Signature
```javascript
unsetSession(hook, hook.type, hook.data, hook.data.eventType, hook.data.userId, hook.app, hook.service, hook.service.usersServicePath)
```

### Description

After hook that clears the session data on the matching user document upon logout.

Listens for Keycloak events of type `Event.LOGOUT`. When triggered, it looks up
the user by their `keycloakId` and patches their document by setting the `session`
field to `null`.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| hook | object | yes | The FeathersJS hook context. |
| hook.type | &#x27;after&#x27; | yes | Must be &#x60;&#x27;after&#x27;&#x60;. |
| hook.data | object | yes | The Keycloak event object. |
| hook.data.eventType | string | yes | The Keycloak event type. Only &#x60;&#x27;Event.LOGOUT&#x27;&#x60; is processed. |
| hook.data.userId | string | yes | The Keycloak user ID used to look up the local user. |
| hook.app | object | yes | The FeathersJS application instance. |
| hook.service | object | yes | The service that triggered the hook. |
| hook.service.usersServicePath | string | yes | Path to the users service (e.g. &#x60;&#x27;users&#x27;&#x60;). |

### Returns

| Type | Description |
|------|-------------|
| Promise.&lt;object&gt; | The hook context, unmodified if the event type is not &#x60;Event.LOGOUT&#x60;. |

### Examples

```javascript
import { unsetSession } from './hooks/sessions'

app.service('keycloak-events').hooks({
  after: {
    create: [unsetSession]
  }
})
```


---


