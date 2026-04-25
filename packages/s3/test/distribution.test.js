import makeDebug from 'debug'
import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import feathersClient from '@feathersjs/client'
import feathersSocketio from '@feathersjs/socketio'
import io from 'socket.io-client'
import distribution, { finalize } from '@kalisio/feathers-distributed'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import fs from 'fs'
import utility from 'util'
import crypto from 'crypto'
import { Blob } from 'buffer'
import { Service } from '../src/server/index.js'
import { getClientService } from '../src/client/index.js'

feathers.setDebug(makeDebug)
feathersClient.setDebug(makeDebug)
const debugClient = makeDebug('feathers-s3:distributed-client')

let consumerApp, consumerService, storageApp, storageService, expressServer, clientApp, clientService, socket, transport

const options = {
  s3Client: {
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    signatureVersion: 'v4'
  },
  bucket: process.env.S3_BUCKET,
  prefix: crypto.randomUUID()
}

const methods = [
  'create', 'get', 'find', 'remove', 'createMultipartUpload', 'completeMultipartUpload',
  'uploadPart', 'putObject', 'uploadFile', 'downloadFile'
]
const events = [
  'created', 'removed', 'multipart-upload-created', 'multipart-upload-completed',
  'part-uploaded', 'object-put', 'file-uploaded', 'file-downloaded'
]

const distributionConfig = {
  consumerApp: {
    services: (service) => false,
    remoteServices: (service) => service.path.endsWith('s3'),
    distributedMethods: methods,
    distributedEvents: events,
    cote: {
      helloInterval: 2000,
      checkInterval: 4000,
      nodeTimeout: 5000,
      masterTimeout: 6000,
      basePort: 5000,
      highestPort: 5999,
      port: 12344
    },
    publicationDelay: 5000
  },
  storageApp: {
    services: (service) => service.path.endsWith('s3'),
    remoteServices: (service) => false,
    distributedMethods: methods,
    distributedEvents: events,
    cote: {
      helloInterval: 2000,
      checkInterval: 4000,
      nodeTimeout: 5000,
      masterTimeout: 6000,
      basePort: 5000,
      highestPort: 5999,
      port: 12344
    },
    publicationDelay: 5000
  }
}

const fileId = 'image.png'
const fileContent = fs.readFileSync('test/data/image.png')

describe('feathers-s3-distribution', () => {
  beforeAll(() => {
    consumerApp = express(feathers())
    consumerApp.use(express.json({ limit: 100 * 1024 * 1024 }))
    consumerApp.configure(express.rest())
    consumerApp.configure(feathersSocketio({ maxHttpBufferSize: 1e8 }))
    consumerApp.configure(distribution(distributionConfig.consumerApp))
    storageApp = feathers()
    storageApp.configure(distribution(distributionConfig.storageApp))
    clientApp = feathersClient()
    socket = io('http://localhost:3335')
    transport = feathersClient.socketio(socket)
    clientApp.configure(transport)
  })

  it('create the services', async () => {
    storageApp.use('s3', new Service(options), { methods, events })
    storageService = storageApp.service('s3')
    expect(storageService).toBeTruthy()
    await utility.promisify(setTimeout)(10000)
    consumerService = consumerApp.service('s3')
    expect(consumerService).toBeTruthy()
    clientService = getClientService(clientApp, {
      servicePath: 's3',
      transport,
      useProxy: true,
      fetch: globalThis.fetch,
      debug: debugClient
    })
    expect(clientService).toBeTruthy()
    expressServer = await consumerApp.listen(3335)
  })

  it('upload data file', async () => {
    let eventReceived = false
    consumerService.once('object-put', (data) => {
      if (data.id === fileId) eventReceived = true
    })
    const response = await consumerService.putObject({
      id: fileId,
      buffer: fileContent,
      type: 'image/png'
    })
    expect(response.id).toBe(fileId)
    expect(response.ETag).toBeTruthy()
    expect(eventReceived).toBe(true)
  })

  it('download data file', async () => {
    const response = await consumerService.get(fileId)
    expect(response.id).toBe(fileId)
    expect(response.buffer).toBeTruthy()
    expect(response.type).toBe('image/png')
    const buffer = storageService.atob(response.buffer)
    expect(buffer.toString()).toBe(fileContent.toString())
  })

  it('remove data file', async () => {
    const response = await consumerService.remove(fileId)
    expect(response.id).toBe(fileId)
    expect(response.$metadata.httpStatusCode).toBe(204)
  })

  it('upload data file from client', async () => {
    const blob = new Blob([fileContent], { type: 'image/png' })
    const response = await clientService.upload(fileId, blob, { expiresIn: 30 })
    await utility.promisify(setTimeout)(5000)
    expect(response.ETag).toBeTruthy()
  })

  it('download data file from client', async () => {
    const response = await clientService.download(fileId, { expiresIn: 30 })
    expect(response.type).toBe('image/png')
    expect(response.buffer).toBeTruthy()
    expect(Buffer.from(response.buffer).toString()).toBe(fileContent.toString())
  })

  it('remove data file from client', async () => {
    const response = await clientService.remove(fileId)
    expect(response.$metadata.httpStatusCode).toBe(204)
  })

  afterAll(async () => {
    await expressServer.close()
    finalize(consumerApp)
    finalize(storageApp)
  })
})
