import makeDebug from 'debug'
import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import sharp from 'sharp'
import fs from 'fs'
import crypto from 'crypto'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { Service } from '../src/server/index.js'

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

const fileId = 'image.png'
const fileContent = fs.readFileSync('test/data/image.png')
let resizedFileContent

async function resizeImage (hook) {
  resizedFileContent = await sharp(hook.data.buffer)
    .resize(128, 48, { fit: 'contain', background: '#00000000' })
    .toBuffer()
  await sharp(resizedFileContent).toFile('test/tmp/resized-image.png')
  hook.data.buffer = resizedFileContent
}

describe('feathers-s3-processing', () => {
  beforeAll(async () => {
    app = express(feathers())
    app.use(express.json())
    app.configure(express.rest())
  })

  it('configure the service', async () => {
    app.use('s3', new Service(options), {
      methods: ['create', 'get', 'find', 'remove', 'putObject']
    })
    service = app.service('s3')
    expect(service).toBeDefined()
    service.hooks({
      before: { putObject: [resizeImage] }
    })
    expressServer = await app.listen(3334)
  })

  it('upload with processing', async () => {
    let eventReceived = false
    service.once('object-put', (data) => {
      if (data.id === fileId) eventReceived = true
    })
    const response = await service.putObject({ id: fileId, buffer: fileContent, type: 'image/png' })
    expect(response.id).toBe(fileId)
    expect(response.ETag).toBeDefined()
    expect(eventReceived).toBe(true)
  })

  it('download processed file', async () => {
    const response = await service.get(fileId)
    expect(response.id).toBe(fileId)
    expect(response.buffer).toBeDefined()
    expect(response.type).toBe('image/png')
    const buffer = service.atob(response.buffer)
    expect(buffer.toString()).toBe(resizedFileContent.toString())
    await sharp(buffer).toFile('test/tmp/downloaded-resized-image.png')
    const resizedImage = fs.readFileSync('test/tmp/resized-image.png')
    const downloadedImage = fs.readFileSync('test/tmp/downloaded-resized-image.png')
    expect(resizedImage.toString()).toBe(downloadedImage.toString())
  })

  it('remove uploaded file', async () => {
    fs.unlinkSync('test/tmp/resized-image.png')
    fs.unlinkSync('test/tmp/downloaded-resized-image.png')
    const response = await service.remove(fileId)
    expect(response.id).toBe(fileId)
    expect(response.$metadata.httpStatusCode).toBe(204)
  })

  afterAll(async () => {
    await expressServer.close()
  })
})
