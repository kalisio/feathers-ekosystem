---
title: Client API
description: Helper functions to simplify S3 uploads and downloads on the client side.
---

# Client

## getClientService (app, options)

Returns the client service interface. The service exposes the S3 custom methods and is decorated with two helpers,
`upload` and `download`, to simplify file transfers (including multipart uploads).

| Argument | Description | Required |
|---|---|---|
| `app` | The Feathers client application. | yes |
| `options` | Client service configuration (see below). | yes |

The available options are:

| Option | Description | Default |
|---|---|---|
| `transport` | Feathers transport used to register the client service. **Required.** | — |
| `servicePath` | Path of the S3 service. | `s3` |
| `chunkSize` | Part size for multipart uploads, in bytes. Must be at least 5 MiB. Files larger than this value use multipart upload. | `5 * 1024 * 1024` |
| `concurrency` | Maximum number of parts uploaded concurrently during a multipart upload. | `4` |
| `useProxy` | Transfer object data through the Feathers backend instead of directly through presigned URLs. | `false` |
| `request` | Options passed to the `@kalisio/common-core` request operator for direct HTTP transfers through presigned URLs. | `{}` |
| `btoa` | Function used to encode the uploaded buffer when using proxy mode. | Base64 encoding |
| `atob` | Function used to decode the downloaded buffer when using proxy mode. | Base64 decoding |
| `debug` | Optional function receiving debug messages. | None |

### Parallel multipart uploads (issue #24)

When `blob.size` is greater than `chunkSize`, the `upload` helper splits the blob into parts and uploads them with bounded concurrency.
Set `concurrency` to a positive integer to limit the number of simultaneous part uploads. The default is `4`. This limit is per `upload`
call, not shared across multiple uploads. It applies to multipart uploads in both direct and proxy modes; singlepart uploads are unaffected.

Parts may finish in a different order, but their original part numbers are preserved when the multipart upload is completed. The helper
waits for all parts to finish before calling `completeMultipartUpload`.

### HTTP request options (issue #23)

In direct mode (`useProxy: false`), `singlePartUpload` and `download` use the [`@kalisio/common-core` request operator](https://github.com/kalisio/common-ekosystem/blob/master/packages/common-core/src/operators/request.js)
for HTTP requests to presigned URLs, instead of calling `fetch` directly. Use `request` to configure that operator:

| `request` option | Description | Default |
|---|---|---|
| `retries` | Maximum number of additional attempts after the initial HTTP request. | `0` |
| `retryDelay` | Delay between attempts in milliseconds, or a function returning that delay. | `1000` |
| `timeout` | Timeout per HTTP attempt in milliseconds, or a function returning it. | No timeout |
| `signal` | Optional `AbortSignal` for cancelling direct HTTP requests. | None |

The operator can retry network failures and responses with status `408`, `429` or `5xx`. It also accepts standard `fetch` initialization
options. These settings apply **only to direct PUT/GET transfers**: they do not configure Feathers service calls (such as presigned URL
creation or multipart completion) and are not used for transfers in proxy mode. Retries must complete before the presigned URL expires.

For example, assuming `app` and `transport` have already been configured:

```js
import { getClientService } from '@kalisio/feathers-s3/client'

const s3 = getClientService(app, {
  transport,
  chunkSize: 10 * 1024 * 1024,
  concurrency: 4,
  request: {
    retries: 2,
    retryDelay: 1000,
    timeout: 30000
  }
})

await s3.upload('files/example.bin', file)
const { buffer, type } = await s3.download('files/example.bin')
```

## upload (id, blob, options, params)

Uploads a `Blob` to the bucket under the given object key. A blob no larger than `chunkSize` is uploaded in one request (`PutObject`); a
larger blob is uploaded in multiple parts (`UploadPart`). The blob must have a nonempty `type`.

In direct mode, the helper requests presigned URLs and transfers data over HTTP using the configured `request` options. In proxy mode,
data is sent through the Feathers backend via `putObject` or `uploadPart`.

| Argument | Description | Required |
|---|---|---|
| `id` | Object key. The backend service also applies its configured `prefix`. | yes |
| `blob` | Content to upload, as a `Blob` with a MIME type. | yes |
| `options` | Options forwarded to the underlying S3 service methods. | no |
| `params` | Feathers params forwarded to the underlying service calls. | no |

## download (id, options, params)

Downloads the object with the given key. In direct mode, the helper requests a presigned `GetObject` URL and uses the configured
`request` options for the HTTP GET. In proxy mode, it uses the Feathers service `get` method.

| Argument | Description | Required |
|---|---|---|
| `id` | Object key. The backend service also applies its configured `prefix`. | yes |
| `options` | Options forwarded when requesting the presigned URL in direct mode. | no |
| `params` | Feathers params forwarded to the underlying service calls. | no |

The helper resolves to an object containing `buffer` (the downloaded binary data) and `type` (its content type).
