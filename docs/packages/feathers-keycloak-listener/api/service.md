---
title: service
---

# service

## create

### Signature

```js
create(data, params)
```

### Description

Normalizes a Keycloak event by computing and attaching an `eventType` string,
then returns a success acknowledgement.

The `eventType` is built differently depending on `data.eventClass`:
- **AdminEvent** → `AdminEvent.<operationType>.<resourceType>`
  (e.g. `AdminEvent.CREATE.USER`)
- **User event** → `<eventClass>.<type>`
  (e.g. `Event.LOGIN`)

After this method runs, registered `after` hooks receive the mutated `data` object 
(with `eventType` set) and can act on it accordingly.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| data | object | yes | The raw Keycloak event payload. |
| params | object | yes | The FeathersJS service call parameters. |

### Returns

| Type | Description |
|------|-------------|
| `Promise<object>` | Always resolves with &#x60;{ success: true }&#x60; on success. |

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


