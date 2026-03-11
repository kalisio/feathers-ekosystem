import makeDebug from 'debug'
import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import { Service as S3Service } from '@kalisio/feathers-s3/server'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { Service } from '../src/index.js'
import { createMongoService, removeMongoService } from './utils.mongodb.js'

feathers.setDebug(makeDebug)

let app
let s3Service
let service
let expressServer

const options = {
  s3Options: {
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
    prefix: Date.now().toString()
  },
  allowedServicePaths: 'objects',
  workingDir: './test/tmp'
}

describe('feathers-import-export:exception', () => {
  beforeAll(async () => {
    app = express(feathers())
    app.use(express.json())
    app.configure(express.rest())

    app.use('objects', await createMongoService('objects'))
    expect(app.service('objects')).toBeTruthy()

    app.use('path-to-s3', new S3Service(options.s3Options), {
      methods: ['uploadFile', 'downloadFile']
    })
    s3Service = app.service('path-to-s3')
    expect(s3Service).toBeTruthy()

    app.use('import-export', new Service(Object.assign(options, { app })))
    service = app.service('import-export')
    expect(service).toBeTruthy()

    expressServer = await app.listen(3333)
  })

  it('is ES module compatible', () => {
    expect(typeof Service).toBe('function')
  })

  it('fail to import with a non allowed service path', async () => {
    await expect(service.create({
      method: 'import',
      id: 'objects.json',
      servicePath: 'users'
    })).rejects.toThrow("import: service path 'users' is not allowed")
  })

  it('fail to export with a non allowed service path', async () => {
    await expect(service.create({
      method: 'export',
      servicePath: 'users',
      format: 'json'
    })).rejects.toThrow("export: service path 'users' is not allowed")
  })

  afterAll(async () => {
    await removeMongoService('objects')
    await expressServer.close()
  })
})
