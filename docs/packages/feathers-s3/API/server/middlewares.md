---
title: Middlewares
description: An [Express middleware](http://expressjs.com/en/guide/using-middleware.html) to access an object from the store
---

# Middlewares

## getObject (service)

It expect to be setup on a route path like `path/to/get/*` where the last parameter is the path to the object in the target bucket.
It is associated with an S3 service to use the same configuration (s3client, bucket, etc...).

| Argument | Description | Required |
|---|---|---|
| `service` | the service to be associated to this midlleware. | yes |

```js
// How to setup the route
app.get('/s3-objects/*', getObject(service))
// How to use it with any request agent like superagent
const response = await superagent.get('your.domain.com/s3-objects/my-file.png')
```

You can also simply use the target object URL in your HTML: `<img src="your.domain.com/s3-objects/my-file.png">`.

If you'd like to authenticate the route on your backend you will have to do something like this:

```js
import { authenticate } from '@feathersjs/express'

app.get('/s3-objects/*', authenticate('jwt'), getObject(service))
```

In this case, if you need to reference the object by the URL it will require you to add the JWT as a query parameter like this: `<img src="your.domain.com/s3-objects/my-file.png?jwt=TOKEN">`. The JWT can then be extracted by a middleware:

```js
import { authenticate } from '@feathersjs/express'

app.get('/s3-objects/*', (req, res, next) => {
  req.feathers.authentication = {
    strategy: 'jwt',
    accessToken: req.query.jwt
  }
  next()
}, authenticate('jwt'), getObject(service))
```