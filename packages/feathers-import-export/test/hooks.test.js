import fs from 'node:fs'
import crypto from 'node:crypto'
import makeDebug from 'debug'
import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import { Service as S3Service } from '@kalisio/feathers-s3/server'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { Service, hooks } from '../src/index.js'
import { createMongoService, removeMongoService } from './utils.mongodb.js'
import { getTmpPath, gunzipDataset, clearDataset } from './utils.dataset.js'

feathers.setDebug(makeDebug)

const port = 3103
const namespace = 'hooks'

let app
let s3Service
let service
let expressServer
let inputId
let outputId

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
    prefix: crypto.randomUUID()
  },
  allowedServicePaths: `${namespace}-features`,
  workingDir: './test/tmp'
}

const servicePath = `${namespace}-features`

const scenarios = [
  {
    name: `${namespace}-features-geojson`,
    dataset: 'features.geojson',
    upload: { contentType: 'application/geo+json' },
    import: { method: 'import', servicePath, id: 'features.geojson' },
    export: {
      method: 'export',
      servicePath,
      chunkSize: 100,
      transform: { omit: ['_id'] },
      format: 'geojson',
      filename: 'features.geojson',
      reprojectGeoJson: { srs: 'EPSG:3857' }
    },
    expect: {
      import: { objects: 255 },
      export: { objects: 255, size: 30128000 }
    }
  },
  {
    name: `${namespace}-features-shp`,
    dataset: 'features.geojson',
    upload: { contentType: 'application/geo+json' },
    import: { method: 'import', servicePath, id: 'features.geojson' },
    export: {
      method: 'export',
      servicePath,
      chunkSize: 100,
      transform: { omit: ['_id'] },
      format: 'geojson',
      filename: 'features.shp.zip',
      reprojectGeoJson: { srs: 'EPSG:3857' },
      convertGeoJson: { ogrDriver: 'ESRI Shapefile', contentType: 'application/zip' }
    },
    expect: {
      import: { objects: 255 },
      export: { objects: 255, size: 7393565 }
    }
  },
  {
    name: `${namespace}-features-kml`,
    dataset: 'features.geojson',
    upload: { contentType: 'application/geo+json' },
    import: { method: 'import', servicePath, id: 'features.geojson' },
    export: {
      method: 'export',
      servicePath,
      chunkSize: 100,
      transform: { omit: ['_id'] },
      format: 'geojson',
      filename: 'features.kml',
      convertGeoJson: { ogrDriver: 'KML', contentType: 'application/vnd.google-earth.kml+xml' }
    },
    expect: {
      import: { objects: 255 },
      export: { objects: 255, size: 18378282 }
    }
  }
]

function runTests (scenario) {
  it(`[${scenario.name}] remove mongo service`, async () => {
    await removeMongoService(servicePath)
  })

  it(`[${scenario.name}] unzip input dataset`, async () => {
    await gunzipDataset(namespace, scenario.dataset)
  })

  it(`[${scenario.name}] upload input dataset`, async () => {
    const response = await s3Service.uploadFile({
      filePath: getTmpPath(namespace, scenario.dataset),
      contentType: scenario.upload.contentType,
      chunkSize: 1024 * 1024 * 10
    })
    expect(response.id).toBeTruthy()
    inputId = response.id
  }, 300000)

  it(`[${scenario.name}] import input dataset`, async () => {
    const response = await service.create(scenario.import)
    expect(response.objects).toBe(scenario.expect.import.objects)
  }, 120000)

  it(`[${scenario.name}] check imported collection`, async () => {
    const svc = app.service(servicePath)
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
    expect(response.filename).toBe(scenario.export.filename)
    expect(response.id).toBeTruthy()
    outputId = response.id
  }, 180000)

  it(`[${scenario.name}] list output file`, async () => {
    const response = await s3Service.find()
    expect(response.length).toBe(1)
  })

  it(`[${scenario.name}] download output file`, async () => {
    const tmpFilePath = getTmpPath(namespace, outputId)
    const response = await s3Service.downloadFile({ id: outputId, filePath: tmpFilePath })
    expect(response.id).toBeTruthy()
    const size = fs.statSync(getTmpPath(namespace, outputId)).size
    expect(size).toBeCloseTo(scenario.expect.export.size, -2) // ±50 octets
  })

  it(`[${scenario.name}] clean output files`, async () => {
    const response = await s3Service.remove(outputId)
    expect(response.$metadata.httpStatusCode).toBe(204)
    clearDataset(namespace, outputId)
    outputId = undefined
  })

  it(`[${scenario.name}] clean database`, async () => {
    const svc = app.service(servicePath)
    const response = await svc.remove(null)
    expect(response.length).toBe(scenario.expect.export.objects)
  })
}

describe('feathers-import-export:hooks', () => {
  beforeAll(async () => {
    app = express(feathers())
    app.use(express.json())
    app.configure(express.rest())

    app.use(servicePath, await createMongoService(servicePath))
    expect(app.service(servicePath)).toBeTruthy()

    app.use('path-to-s3', new S3Service(options.s3Options), {
      methods: ['uploadFile', 'downloadFile']
    })
    s3Service = app.service('path-to-s3')
    expect(s3Service).toBeTruthy()

    app.use('import-export', new Service(Object.assign(options, { app })))
    service = app.service('import-export')
    expect(service).toBeTruthy()

    service.s3Service.hooks({
      before: {
        uploadFile: [hooks.reprojectGeoJson, hooks.convertGeoJson]
      }
    })

    expressServer = await app.listen(port)
  })

  it('is ES module compatible', () => {
    expect(typeof Service).toBe('function')
  })

  for (const scenario of scenarios) runTests(scenario)

  afterAll(async () => {
    await removeMongoService(servicePath)
    await expressServer.close()
  })
})
