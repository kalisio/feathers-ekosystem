---
title: service
---

# service

## create

### Signature
```javascript
create(data, data.eventClass, data.operationType, data.resourceType, data.type, params)
```

### Description

Normalizes a Keycloak event by computing and attaching an `eventType` string,
then returns a success acknowledgement.

The `eventType` is built differently depending on `data.eventClass`:
- **AdminEvent** → `'AdminEvent.<operationType>.<resourceType>'`
  (e.g. `'AdminEvent.CREATE.USER'`)
- **User event** → `'<eventClass>.<type>'`
  (e.g. `'Event.LOGIN'`)

After this method runs, registered `after` hooks receive the mutated `data`
object (with `eventType` set) and can act on it accordingly.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| data | object | yes | The raw Keycloak event payload. |
| data.eventClass | string | yes | The event class, either &#x60;&#x27;AdminEvent&#x27;&#x60; or a user event class (e.g. &#x60;&#x27;Event&#x27;&#x60;). |
| data.operationType | string | no | The operation type for admin events (e.g. &#x60;&#x27;CREATE&#x27;&#x60;, &#x60;&#x27;UPDATE&#x27;&#x60;, &#x60;&#x27;DELETE&#x27;&#x60;). |
| data.resourceType | string | no | The resource type for admin events (e.g. &#x60;&#x27;USER&#x27;&#x60;). |
| data.type | string | no | The event type for user events (e.g. &#x60;&#x27;LOGIN&#x27;&#x60;, &#x60;&#x27;LOGOUT&#x27;&#x60;). |
| params | object | yes | The FeathersJS service call parameters. |

### Returns

| Type | Description |
|------|-------------|
| Promise.&lt;{success: boolean}&gt; | Always resolves with &#x60;{ success: true }&#x60; on success. |

### Examples

```javascript
// Admin event input
await app.service('keycloak-events').create({
  eventClass: 'AdminEvent',
  operationType: 'CREATE',
  resourceType: 'USER',
  resourcePath: 'users/abc-123',
  value: { username: 'john' }
})
// → data.eventType is set to 'AdminEvent.CREATE.USER' for after hooks
```

```javascript
// User event input
await app.service('keycloak-events').create({
  eventClass: 'Event',
  type: 'LOGIN',
  userId: 'abc-123'
})
// → data.eventType is set to 'Event.LOGIN' for after hooks
```


---


