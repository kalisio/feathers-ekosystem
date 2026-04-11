import makeDebug from 'debug'
import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import superagent from 'superagent'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { Blob } from 'node:buffer'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { Service, getObject } from '../src/server/index.js'

feathers.setDebug(makeDebug)

let app, service, expressServer

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

const fileId = 'data/features.geojson'
const filePath = 'test/data/features.geojson'
const tmpFilePath = 'test/tmp/features.geojson'
const fileType = 'application/geo+json'
const fileContent = fs.readFileSync(filePath)
const blob = new Blob([fileContent], { type: fileType })
const chunkSize = 1024 * 1024 * 5
let uploadId
const parts = []

describe('feathers-s3-service', () => {
  beforeAll(async () => {
    app = express(feathers())
    app.use(express.json())
    app.configure(express.rest())
  })

  it('is ES module compatible', () => {
    expect(typeof Service).toBe('function')
  })

  it('create the service', async () => {
    app.use('s3', new Service(options), {
      methods: [
        'create', 'get', 'find', 'remove', 'createMultipartUpload', 'completeMultipartUpload',
        'uploadPart', 'putObject', 'uploadFile', 'downloadFile'
      ]
    })
    service = app.service('s3')
    expect(service).toBeDefined()
    app.get('/s3-objects/*', getObject(service))
    expressServer = await app.listen(3333)
  })

  it('createMultipartUpload', async () => {
    let eventReceived = false
    service.once('multipart-upload-created', (data) => {
      if (data.id === fileId) eventReceived = true
    })
    const response = await service.createMultipartUpload({ id: fileId, type: blob.type })
    expect(response.id).toBe(fileId)
    expect(response.UploadId).toBeDefined()
    uploadId = response.UploadId
    expect(eventReceived).toBe(true)
  })

  it('uploadPart 1', async () => {
    let eventReceived = false
    service.once('part-uploaded', (data) => {
      if (data.id === fileId) eventReceived = true
    })
    const response = await service.uploadPart({
      id: fileId,
      buffer: await blob.slice(0, chunkSize).arrayBuffer(),
      type: blob.type,
      PartNumber: 1,
      UploadId: uploadId
    }, { expiresIn: 30 })
    expect(response.id).toBe(fileId)
    expect(response.ETag).toBeDefined()
    parts.push({ PartNumber: 1, ETag: response.ETag })
    expect(eventReceived).toBe(true)
  })

  it('uploadPart 2', async () => {
    let eventReceived = false
    service.once('part-uploaded', (data) => {
      if (data.id === fileId) eventReceived = true
    })
    const response = await service.uploadPart({
      id: fileId,
      buffer: await blob.slice(chunkSize, blob.size).arrayBuffer(),
      type: blob.type,
      PartNumber: 2,
      UploadId: uploadId
    }, { expiresIn: 30 })
    expect(response.id).toBe(fileId)
    expect(response.ETag).toBeDefined()
    parts.push({ PartNumber: 2, ETag: response.ETag })
    expect(eventReceived).toBe(true)
  })

  it('completeMultipartUpload', async () => {
    let eventReceived = false
    service.once('multipart-upload-completed', (data) => {
      if (data.id === fileId) eventReceived = true
    })
    const response = await service.completeMultipartUpload({ id: fileId, UploadId: uploadId, parts })
    expect(response.id).toBe(fileId)
    expect(response.ETag).toBeDefined()
    expect(response.Location).toBeDefined()
    expect(eventReceived).toBe(true)
  })

  it('list remote objects', async () => {
    const response = await service.find()
    expect(response.length).toBe(1)
    expect(response[0].Key).toBe(fileId)
  })

  it('download object with middleware', async () => {
    const response = await superagent.get(`http://localhost:3333/s3-objects/${fileId}`)
    expect(response.text).toBe(fileContent.toString())
  })

  it('raises error with middleware', async () => {
    try {
      await superagent.get('http://localhost:3333/s3-objects/nosuchkey')
      throw new Error('middleware should raise on error')
    } catch (error) {
      expect(error.status).toBe(404)
      expect(error.response.text.includes('NoSuchKey')).toBe(true)
    }
  })

  it('download object with service method', async () => {
    const response = await service.get(fileId)
    expect(response.id).toBe(fileId)
    expect(response.buffer).toBeDefined()
    expect(response.type).toBe('application/geo+json')
    const buffer = service.atob(response.buffer)
    expect(buffer.toString()).toBe(fileContent.toString())
  })

  it('remove remote object', async () => {
    const response = await service.remove(fileId)
    expect(response.id).toBe(fileId)
    expect(response.$metadata.httpStatusCode).toBe(204)
  })

  it('upload file', async () => {
    const response = await service.uploadFile({ id: fileId, filePath, contentType: fileType })
    expect(response.id).toBe(fileId)
    expect(response.Key).toBe(`${options.prefix}/${fileId}`)
    expect(response.ETag).toBeDefined()
  })

  it('list remote files', async () => {
    const response = await service.find()
    expect(response.length).toBe(1)
    expect(response[0].Key).toBe(fileId)
  })

  it('get signed url to download file', async () => {
    const response = await service.create({ id: fileId, command: 'GetObject' })
    expect(response.SignedUrl).toBeDefined()
  })

  it('download file', async () => {
    await service.downloadFile({ id: fileId, filePath: tmpFilePath })
    expect(fs.statSync(filePath).size).toBe(6868192)
  })

  it('remove remote and local files', async () => {
    const response = await service.remove(fileId)
    expect(response.id).toBe(fileId)
    expect(response.$metadata.httpStatusCode).toBe(204)
    fs.unlinkSync(tmpFilePath)
  })

  it('put objects under a common prefix', async () => {
    const buffer = await blob.arrayBuffer()
    await service.putObject({ id: 'test-folder/file1.txt', buffer, type: 'text/plain' })
    await service.putObject({ id: 'test-folder/file2.txt', buffer, type: 'text/plain' })
    await service.putObject({ id: 'test-folder/file3.txt', buffer, type: 'text/plain' })
    const response = await service.find({ query: { Prefix: 'test-folder' } })
    expect(response.length).toBe(3)
  })

  it('remove objects recursively', async () => {
    const response = await service.remove('test-folder', { query: { recursive: true } })
    expect(response.id).toBe('test-folder')
    expect(response.deleted).toHaveLength(3)
    expect(response.deleted.every(d => d.Key.includes('test-folder'))).toBe(true)
  })

  it('check remote is empty', async () => {
    const response = await service.find({ query: { Prefix: 'test-folder' } })
    expect(response.length).toBe(0)
  })

  afterAll(async () => {
    await expressServer.close()
  })
})
