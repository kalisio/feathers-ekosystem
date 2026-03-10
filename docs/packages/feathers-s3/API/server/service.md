---
title: Service
description: A Feathers service that provides basic methods for using **S3** API
---

# Service

## constructor (options)

Create an instance of the service with the given options:

| Parameter | Description | Required |
|---|---|---|
|`s3Client` | the s3Client [configuration](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/s3client.html#config). | yes |
| `bucket` |  the bucket to use. | yes |
| `prefix` | an optional prefix to use when computing the final **Key** | no |
| `btoa` | the binary to ascii function used to transform sent data into a string. Default is to transform to base64. | no |
| `atob` | the ascii to binary function used to transform received data into a Buffer. Default is to transform back from base64. | no |

## find (params)

Lists some objects in a bucket according given criteria provided in the `params.query` object.

Check the [ListObjectsCommandInput](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/listobjectscommandinput.html) documentation to have the list of supported poperties.

## create (data, params)

Generates a presigned URL for the following commands:
* [PutObjectCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/putobjectcommand.html)
* [GetObjectCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/getobjectcommand.html)
* [UploadPartCommnad](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/uploadpartcommand.html)

The payload `data` must contain the following properties:

| Property | Description |
|---|---|
| `command` | the command for which the presigned URL should be created. The possible values are `GetObject`, `PutObject` and `UploadPart`. |
| `id` |  the object key. Note that the final computed **Key** takes into account the `prefix` option of the service. |
| `UploadId` | the **UploadId** generated when calling the [createMultipartUpload](#createmultipartupload-data-params) method. It is required if the command is `UploadPart` |
| `PartNumber` | the **PartNumber** of the part to be uploaded. It is required  if the command is `UploadPart` |

## get (id, params)

Get an object content from a bucket.

| Parameter | Description |
|---|---|
| `id` |  the object key. Note that the final computed **Key** takes into account the `prefix` option of the service. |

> [!NOTE]
> The object will be entirely read and transferred to the client, for large files consider using presigned URLs instead.

## remove (id, params)

Remove an object fromt the bucket.

| Parameter | Description |
|---|---|
| `id` |  the object key. Note that the final computed **Key** takes into account the `prefix` option of the service. |

## createMultipartUpload (data, params)

Initiate a multipart upload.

It wraps the [CreateMultipartUploadCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/createmultipartuploadcommandoutput.html).

The payload `data` must contain the following properties:

| Property | Description |
|---|---|
| `id` |  the object key. Note that the final computed **Key** takes into account the `prefix` option of the service. |
| `type` | the content type to be uploaded. |

Any optional properties are forwarded to the underlying `CreateMultipartUploadCommand` command parameters.

## completeMultipartUpload (data, params)

Finalize a multipart upload.

It wraps the [CompleteMultipartUploadCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/completemultipartuploadcommand.html).

The payload `data` must contain the following properties:

| Property | Description |
|---|---|
| `id` |  the object key. Note that the final computed **Key** takes into account the `prefix` option of the service. |
| `UploadId` | the **UploadId** generated when calling the [createMultipartUpload](#createmultipartupload-data-params) method. |
| `parts` | the uploaded parts. It consists in an array of objects following the schema: `{ PartNumber: <number>, ETag: <etag> )}`. |

Any optional properties are forwarded to the underlying `CompleteMultipartUploadCommand` command parameters.

## uploadPart (data, params)

Upload a part to a bucket.

The payload `data` must contain the following properties:

| Property | Description |
|---|---|
| `id` |  the object key. Note that the final computed **Key** takes into account the `prefix` option of the service. |
| `UploadId` | the **UploadId** generated when calling the [createMultipartUpload](#createmultipartupload-data-params) method. |
| `PartNumber` | the part number. |
| `buffer` | the content to be uploaded. |
| `type` | the content type to be uploaded. |

## putObject (data, params)

Upload an object to a bucket.

The payload `data` must contain the following properties:

| Property | Description |
|---|---|
| `id` |  the object key. Note that the final computed **Key** takes into account the `prefix` option of the service. |
| `buffer` | the content to be uploaded. |
| `type` | the content type to be uploaded. |

## getObjectCommand (data, params)

Execute the **GetObjectCommand** and returns the response.

> [!NOTE]
> This method is not declared on the client side.

The payload `data` must contain the following properties:

| Property | Description |
|---|---|
| `id` |  the object key. Note that the final computed **Key** takes into account the `prefix` option of the service. |

## uploadFile (data, params)

Convenient method to upload a file.

> [!NOTE]
> This method is not declared on the client side.

The payload `data` must contain the following properties:

| Property | Description |
|---|---|
| `filePath` | the path to the file to be uploaded. The basename is used for computing the object key. |
| `contentType` | the content type of the file to be uploaded. |

> [!NOTE]
> You can also provide an `id` property to override the computed object key.

## downloadFile (data, params)

Convenient method to download a file.

> [!NOTE]
> This method is not declared on the client side.

The payload `data` must contain the following properties:

| Property | Description |
|---|---|
| `ìd` | the file key. Note that the final computed **Key** takes into account the `prefix` option of the service. |
| `filePath` | the path to the downloaded file.|

