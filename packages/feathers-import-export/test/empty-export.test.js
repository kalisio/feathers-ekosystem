import makeDebug from 'debug'
import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import { Service as S3Service } from '@kalisio/feathers-s3/server'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { Service } from '../src/index.js'
import { createMongoService, removeMongoService } from './utils.mongodb.js'
import { getTmpPath, gunzipDataset, clearDataset } from './utils.dataset.js'

feathers.setDebug(makeDebug)

const port = 3100
const namespace = 'empty-export'

let app
let s3Service
let service
let expressServer
let inputId

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
  allowedServicePaths: '^empty-export-o[a-z]{5}s$',
  workingDir: './test/tmp'
}

const scenarios = [
  {
    name: `${namespace}-objects`,
    dataset: 'objects.json',
    upload: {
      contentType: 'application/json'
    },
    import: {
      method: 'import',
      id: 'objects.json',
      servicePath: `${namespace}-objects`,
      transform: {
        omit: ['thumbnail', 'thumbnail_width', 'thumbnail_height', 'href']
      }
    },
    export: {
      method: 'export',
      servicePath: `${namespace}-objects`,
      query: { $and: [{ year: { $lte: 1000 } }] },
      transform: {
        omit: ['_id']
      },
      format: 'json'
    },
    expect: {
      import: { objects: 36273 },
      export: { objects: 0 }
    }
  }
]

function runTests (scenario) {
  it(`[${scenario.name}] unzip input dataset`, async () => {
    await expect(gunzipDataset(namespace, scenario.dataset)).resolves.not.toThrow()
  })

  it(`[${scenario.name}] upload input dataset`, async () => {
    const response = await s3Service.uploadFile({
      filePath: getTmpPath(namespace, scenario.dataset),
      contentType: scenario.upload.contentType,
      chunkSize: 1024 * 1024 * 10
    })
    expect(response.id).toBeTruthy()
    inputId = response.id
  }, 120000)

  it(`[${scenario.name}] import input dataset`, async () => {
    const response = await service.create(scenario.import)
    expect(response.objects).toBe(scenario.expect.import.objects)
  }, 120000)

  it(`[${scenario.name}] check imported collection`, async () => {
    const svc = app.service(scenario.import.servicePath)
    const response = await svc.find()
    expect(response.total).toBe(scenario.expect.import.objects)
  })

  it(`[${scenario.name}] clean input dataset`, async () => {
    const response = await s3Service.remove(inputId)
    expect(response.$metadata.httpStatusCode).toBe(204)
    clearDataset(namespace, scenario.dataset)
  })

  it(`[${scenario.name}] export collection`, async () => {
    const response = await service.create(scenario.export)
    expect(response.objects).toBe(scenario.expect.export.objects)
    expect(response.id).toBeUndefined()
    expect(response.filename).toBeUndefined()
  }, 180000)

  it(`[${scenario.name}] export collection as zip`, async () => {
    const response = await service.create(Object.assign(scenario.export, { archive: 'zip' }))
    expect(response.objects).toBe(scenario.expect.export.objects)
    expect(response.id).toBeUndefined()
    expect(response.filename).toBeUndefined()
  }, 180000)

  it(`[${scenario.name}] export collection as tgz`, async () => {
    const response = await service.create(Object.assign(scenario.export, { archive: 'tgz' }))
    expect(response.objects).toBe(scenario.expect.export.objects)
    expect(response.id).toBeUndefined()
    expect(response.filename).toBeUndefined()
  }, 180000)

  it(`[${scenario.name}] list output files`, async () => {
    const response = await s3Service.find()
    expect(response.length).toBe(0)
  })
}

describe('feathers-import-export:empty-export', () => {
  beforeAll(async () => {
    app = express(feathers())
    app.use(express.json())
    app.configure(express.rest())

    // create mongo services
    for (const scenario of scenarios) {
      app.use(scenario.name, await createMongoService(scenario.name))
      expect(app.service(scenario.name)).toBeTruthy()
    }
    // create s3 service
    app.use('path-to-s3', new S3Service(options.s3Options), {
      methods: ['uploadFile', 'downloadFile']
    })
    s3Service = app.service('path-to-s3')
    expect(s3Service).toBeTruthy()
    // create import-export service
    app.use('import-export', new Service(Object.assign(options, { app })))
    service = app.service('import-export')
    expect(service).toBeTruthy()
    // run the server
    expressServer = await app.listen(port)
  })

  it('is ES module compatible', () => {
    expect(typeof Service).toBe('function')
  })

  // run the scenarios
  for (const scenario of scenarios) runTests(scenario)

  afterAll(async () => {
    for (const scenario of scenarios) await removeMongoService(scenario.name)
    await expressServer.close()
  })
})
