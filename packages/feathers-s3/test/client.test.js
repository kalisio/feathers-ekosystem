import createDebug from 'debug'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import fs from 'fs'
import crypto from 'crypto'
import { Blob } from 'buffer'
import superagent from 'superagent'
import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import feathersClient from '@feathersjs/client'
import feathersSocketio from '@feathersjs/socketio'
import io from 'socket.io-client'
import { Service } from '../src/server/index.js'
import { getClientService } from '../src/client/index.js'

const { rest } = express

feathers.setDebug(createDebug)
feathersClient.setDebug(createDebug)

const debugClient = createDebug('feathers-s3:client')

let serverApp, expressServer, socket, transport, clientApp, s3Service, s3ClientService

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

const textFileId = 'text.txt'
const imageFileId = 'image.png'
const archiveFileId = 'archive.zip'
const featuresFileId = 'features.geojson'

const textFileContent = fs.readFileSync('test/data/text.txt')
const imageFileContent = fs.readFileSync('test/data/image.png')
const archiveFileContent = fs.readFileSync('test/data/archive.zip')
const featuresFileContent = fs.readFileSync('test/data/features.geojson')

let useProxy = false

function runTests (message, checkEvents) {
  it('create s3 service' + message, () => {
    s3ClientService = getClientService(clientApp, {
      servicePath: 's3',
      transport,
      useProxy,
      fetch: globalThis.fetch,
      debug: debugClient
    })
    expect(s3ClientService).toBeTruthy()
    expect(s3ClientService.createMultipartUpload).toBeTruthy()
    expect(s3ClientService.completeMultipartUpload).toBeTruthy()
    expect(s3ClientService.uploadPart).toBeTruthy()
    expect(s3ClientService.putObject).toBeTruthy()
    expect(s3ClientService.upload).toBeTruthy()
    expect(s3ClientService.download).toBeTruthy()
  })
  it('upload text file' + message, async () => {
    const blob = new Blob([textFileContent], { type: 'text/plain' })
    let eventReceived = false
    if (checkEvents) {
      s3ClientService.once(useProxy ? 'object-put' : 'created', (data) => {
        if (data.id === textFileId) eventReceived = true
      })
    }
    const response = await s3ClientService.upload(textFileId, blob, { expiresIn: 30 })
    expect(response.ETag).toBeTruthy()
    if (checkEvents) expect(eventReceived).toBe(true)
  })
  it('upload image file' + message, async () => {
    const blob = new Blob([imageFileContent], { type: 'image/png' })
    let eventReceived = false
    if (checkEvents) {
      s3ClientService.once(useProxy ? 'object-put' : 'created', (data) => {
        if (data.id === imageFileId) eventReceived = true
      })
    }
    const response = await s3ClientService.upload(imageFileId, blob, { expiresIn: 30 })
    expect(response.ETag).toBeTruthy()
    if (checkEvents) expect(eventReceived).toBe(true)
  })
  it('upload zip file' + message, async () => {
    const blob = new Blob([archiveFileContent], { type: 'application/zip' })
    let eventReceived = false
    if (checkEvents) {
      s3ClientService.once(useProxy ? 'object-put' : 'created', (data) => {
        if (data.id === archiveFileId) eventReceived = true
      })
    }
    const response = await s3ClientService.upload(archiveFileId, blob, { expiresIn: 30 })
    expect(response.ETag).toBeTruthy()
    if (checkEvents) expect(eventReceived).toBe(true)
  })
  it('upload features file' + message, async () => {
    const blob = new Blob([featuresFileContent], { type: 'application/geo+json' })
    let eventsReceived = 0
    if (checkEvents) {
      s3ClientService.once('multipart-upload-created', (data) => {
        if (data.id === featuresFileId) eventsReceived++
      })
      s3ClientService.once(useProxy ? 'part-uploaded' : 'created', (data) => {
        if (data.id === featuresFileId) {
          eventsReceived++
          s3ClientService.once(useProxy ? 'part-uploaded' : 'created', (data) => {
            if (data.id === featuresFileId) eventsReceived++
          })
        }
      })
      s3ClientService.once('multipart-upload-completed', (data) => {
        if (data.id === featuresFileId) eventsReceived++
      })
    }
    const response = await s3ClientService.upload(featuresFileId, blob, { expiresIn: 30 })
    expect(response.ETag).toBeTruthy()
    if (checkEvents) expect(eventsReceived).toBe(4)
  })
  it('list uploaded files', async () => {
    const response = await s3ClientService.find()
    expect(response.length).toBe(4)
  })
  it('download text file' + message, async () => {
    const response = await s3ClientService.download(textFileId, { expiresIn: 30 })
    expect(response.type).toBe('text/plain')
    expect(response.buffer).toBeTruthy()
    expect(Buffer.from(response.buffer).toString()).toBe(textFileContent.toString())
  })
  it('download image file' + message, async () => {
    const response = await s3ClientService.download(imageFileId, { expiresIn: 30 })
    expect(response.type).toBe('image/png')
    expect(response.buffer).toBeTruthy()
    expect(Buffer.from(response.buffer).toString()).toBe(imageFileContent.toString())
  })
  it('download zip file' + message, async () => {
    const response = await s3ClientService.download(archiveFileId, { expiresIn: 30 })
    expect(response.type).toBe('application/zip')
    expect(response.buffer).toBeTruthy()
    expect(Buffer.from(response.buffer).toString()).toBe(archiveFileContent.toString())
  })
  it('download features file' + message, async () => {
    const response = await s3ClientService.download(featuresFileId, { expiresIn: 30 })
    expect(response.type).toBe('application/geo+json')
    expect(response.buffer).toBeTruthy()
    expect(Buffer.from(response.buffer).toString()).toBe(featuresFileContent.toString())
  })
  it('delete text file' + message, async () => {
    const response = await s3ClientService.remove(textFileId)
    expect(response.$metadata.httpStatusCode).toBe(204)
  })
  it('delete image file' + message, async () => {
    const response = await s3ClientService.remove(imageFileId)
    expect(response.$metadata.httpStatusCode).toBe(204)
  })
  it('delete archive file' + message, async () => {
    const response = await s3ClientService.remove(archiveFileId)
    expect(response.$metadata.httpStatusCode).toBe(204)
  })
  it('change proxy mode', () => {
    useProxy = !useProxy
  })
}

describe('feathers-s3-client', () => {
  beforeAll(async () => {
    serverApp = express(feathers())
    serverApp.use(express.json({ limit: 100 * 1024 * 1024 }))
    serverApp.use(express.urlencoded({ extended: true }))
    serverApp.configure(rest())
    serverApp.configure(feathersSocketio({ maxHttpBufferSize: 1e8 }))
    expressServer = await serverApp.listen(3336)
  })

  it('is ES module compatible', () => {
    expect(typeof Service).toBe('function')
    expect(typeof getClientService).toBe('function')
  })

  it('create s3 service', () => {
    serverApp.use('s3', new Service(options), {
      methods: ['create', 'get', 'find', 'remove', 'createMultipartUpload', 'completeMultipartUpload', 'uploadPart', 'putObject'],
      events: ['multipart-upload-created', 'multipart-upload-completed', 'part-uploaded', 'object-put']
    })
    serverApp.on('connection', connection => serverApp.channel('anonymous').join(connection))
    serverApp.publish((data, context) => serverApp.channel('anonymous'))
    s3Service = serverApp.service('s3')
    expect(s3Service).toBeTruthy()
  })

  it('create REST client', () => {
    clientApp = feathersClient()
    transport = feathersClient.rest('http://localhost:3336').superagent(superagent)
    clientApp.configure(transport)
  })
  runTests(' with REST client and without proxy', false)
  runTests(' with REST client and with proxy', false)

  it('create websocket client', () => {
    clientApp = feathersClient()
    socket = io('http://localhost:3336')
    transport = feathersClient.socketio(socket)
    clientApp.configure(transport)
  })
  runTests(' with websocket client and without proxy', true)
  runTests(' with websocket client and with proxy', true)

  afterAll(async () => {
    await expressServer.close()
  })
})
