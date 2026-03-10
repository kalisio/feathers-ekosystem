---
title: Client API
description: Helper functions to simplify the `upload` and `download` logic for the client side.
---

# Client

## getClientService (app, options)

Return the client service interface. The client service exposes the custom methods defined in the [Service](#service) and is also decorated with 2 helper functions that really simplify the logic when implementing a client application, notably for multipart upload.

| Argument | Description |  Required |
|---|---|---|
| `app` |  the **Feathers** client application | yes |
| `options` | the options to pass to the client service | no |

The options are:

| Options | Description | Default |
|---|---|---|
| `transport` | the transport layer used by the **Feathers** client application. For now it is required. |
| `servicePath` | the path to the service. | `s3` |
| `chunkSize` | the size of the chunk to perfom multipart upload. | `5MB` |
| `useProxy` | define whether to use backend as a proxy for custom methods. | `false` |
| `fetch` | the fetch function. | browser fetch function |
| `btoa` | the binary to ascii function used to transform sent data into a string. | transform to base64 |
| `atob` | the ascii to binary function used to transform received data into a Buffer. | transform from base64 |
| `debug` | the debug function. | null |

## upload (id, blob, options)

Upload a **Blob** object to the bucket with the given key `id`.

According the size of chunk you set when instanciang the client service and the size of the `blob`, the method will automatically perform a `singlepart` upload or a `mulitpart` upload.

If the `proxy` option is undefined. The client performs the upload action directly using **fetch**. Otherwise, it uses the [proxyUpload](#proxyupload) custom method.

| Argument | Description | Required |
|---|---|---|
| `id` |  the object key. Note that the final computed **Key** takes into account the `prefix` option of the service. | yes |
| `blob` | the content of the object to be uploaded defined as a **Blob**. | yes |
| `options` | options to be forwarded to the underlying service methods. | no |

## download (key, type, options)

Download an object from the bucket with the given key `id`.

If the `proxy` option is undefined. The client performs the download action directly using **fetch**. Otherwise, it uses the [getObject](#getObject) custom method.

| Argument | Description | Required |
|---|---|---|
| `id` |  the object key. Note that the final computed **Key** takes into account the `prefix` option of the service. | yes |
| `type` | the type of the content to be downloaded. | yes |
| `options` | options to be forwarded to the underlying service methods. | no |