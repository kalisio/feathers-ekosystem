# Service

## constructor (app, options)

Create an instance of the service with the given options:

| Parameter | Description | Required |
|---|---|---|
|`s3Options` | the options to configure the S3 service. Refer to [feathers-s3](https://github.com/kalisio/feathers-s3#constructor-options) API. | yes |
| `app` | the feathers app. | yes |
| `allowedServicePaths` | the allowed path to the services. It must be a regular expression or an array of regular expressions. | yes |
| `workingDir` | the working directory to process temporary files. Default value is `/tmp`. | no |

## registerTransform (key, transform)

Register a transformation function for the given key.

| Parameter | Description | Required |
|---|---|---|
|`key` | the key assigned to the transformation function. | yes |
| `transform` | the transformation function. | yes |

## create (data, params)

Shortcut method that calls [import](#import) or [export](#export) according the value of the `method` property.

The payload `data` must contain the following properties:

| Argument | Description | Required |
|---|---|---|
| `method` | the method to call, either `import` or `export`. | yes |

Concerning the other properties, refer to the description of the different methods.

## import (data, params)

Imports the content of a file that is stored on a **S3** compatible storage.

The payload `data` must contain the following properties:

| Argument | Description | Required |
|---|---|---|
| `id` | the object key. Note that the final computed **key** takes into account the `prefix` option of the service. | yes |
| `servicePath` | the service path into which the data should be imported. | yes |
| `transform`| the [transformation](./#transformation) to apply before importing the data. Default is `undefined` | no |

## export (data, params)

Exports the result of a query into a **JSON**, **CSV** or **GeoJson** file that it stored on an **S3** compatible storage. The file can be archived in [zip](https://en.wikipedia.org/wiki/ZIP_(file_format)) or [tgz](https://en.wikipedia.org/wiki/Gzip) using [Archiver](https://www.archiverjs.com/).
By default It returns a **Presigned URL** to the file.

The payload `data` must contain the following properties:

| Argument | Description | Required
|---|---|---|
| `servicePath` | the service path to be queried..| yes |
| `query` | the query to apply. Default value is `{}` | no |
| `chunkPath`| the path to the data when processing the query response. Default value is `data` | no |
| `chunkSize` | the number of objects to be processed by chunk. Default value is `500` | no |
| `transform`| the [transformation](./#transformation) to apply before exporting the data. Default is `undefined` | no |
| `format` | the output format. Défaut value is `json` | no |
| `archive`| whether to archive the output or not. It should be `zip`, `tgz` or `undefined`. Default value is `undefined` | no |
| `signedUrl` | whether to return a signed url. Default value is `true` | no |
| `expiresIn` | the expiration delay of the returned signed url. Default value is `300` | no |

> [!WARNING]
> The `chunkSize` must be less than the `max` property of the `paginate` options assigned to the service.

