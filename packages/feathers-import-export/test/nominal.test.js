import fs from 'node:fs'
import _ from 'lodash'
import makeDebug from 'debug'
import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import { Service as S3Service } from '@kalisio/feathers-s3/server'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { Service } from '../src/index.js'
import { createMongoService, removeMongoService } from './utils.mongodb.js'
import { getTmpPath, gunzipDataset, clearDataset } from './utils.dataset.js'
import { unzipFile, untarFile } from './utils.archive.js'

feathers.setDebug(makeDebug)

const port = 3100 + Math.floor(Math.random() * 100)
const namespace = 'nominal'

let app
let s3Service
let service
let expressServer
let inputId
let outputIds = []
let outputFilenames = []

function csvImportTransform (chunk) {
  _.forEach(chunk, object => {
    delete object.Index
    delete object['Organization Id']
    object.Founded = _.toNumber(object.Founded)
    object['Number of employees'] = _.toNumber(object['Number of employees'])
  })
  return chunk
}

function csvExportTransform (chunk) {
  _.forEach(chunk, object => {
    delete object._id
  })
  return chunk
}

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
  allowedServicePaths: [`${namespace}-objects`, `${namespace}-features`, `${namespace}-records`],
  workingDir: './test/tmp'
}

const scenarios = [
  {
    name: `${namespace}-objects`,
    dataset: 'objects.json',
    upload: { contentType: 'application/json' },
    import: {
      method: 'import',
      id: 'objects.json',
      servicePath: `${namespace}-objects`,
      transform: { omit: ['thumbnail', 'thumbnail_width', 'thumbnail_height', 'href'] }
    },
    export: {
      method: 'export',
      servicePath: `${namespace}-objects`,
      query: { $and: [{ year: { $gte: 1970 } }, { year: { $lt: 2000 } }] },
      transform: { omit: ['_id'] },
      format: 'json'
    },
    expect: {
      import: { objects: 36273 },
      export: { objects: 6738, size: 3385369 }
    }
  },
  {
    name: `${namespace}-features`,
    dataset: 'features.geojson',
    upload: { contentType: 'application/geo+json' },
    import: {
      method: 'import',
      id: 'features.geojson',
      servicePath: `${namespace}-features`
    },
    export: {
      method: 'export',
      servicePath: `${namespace}-features`,
      chunkSize: 100,
      transform: { omit: ['_id'] },
      format: 'geojson'
    },
    expect: {
      import: { objects: 255 },
      export: { objects: 255, size: 21365820 }
    }
  },
  {
    name: `${namespace}-records`,
    dataset: 'records.csv',
    upload: { contentType: 'text/csv' },
    import: {
      method: 'import',
      id: 'records.csv',
      servicePath: `${namespace}-records`,
      transform: {
        omit: ['Index', 'Organization Id'],
        unitMapping: {
          Founded: { asNumber: true },
          'Number of employees': { asNumber: true }
        }
      }
    },
    export: {
      method: 'export',
      servicePath: `${namespace}-records`,
      query: { $select: ['Name', 'Industry', 'Founded'] },
      transform: 'csv-export-transform'
    },
    expect: {
      import: { objects: 100000 },
      export: { objects: 100000, size: 7562663 }
    }
  }
]

function runTests (scenario) {
  it(`[${scenario.name}] gunzip input dataset`, async () => {
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
    expect(response.id).toBeTruthy()
    outputIds.push(response.id)
    outputFilenames.push(response.filename)
    expect(outputIds.length).toBe(1)
  }, 180000)

  it(`[${scenario.name}] export collection as zip`, async () => {
    const response = await service.create(Object.assign(scenario.export, { archive: 'zip' }))
    expect(response.objects).toBe(scenario.expect.export.objects)
    expect(response.id).toBeTruthy()
    outputIds.push(response.id)
    outputFilenames.push(response.filename)
    expect(outputIds.length).toBe(2)
  }, 180000)

  it(`[${scenario.name}] export collection as tgz`, async () => {
    const response = await service.create(Object.assign(scenario.export, { archive: 'tgz' }))
    expect(response.objects).toBe(scenario.expect.export.objects)
    expect(response.id).toBeTruthy()
    outputIds.push(response.id)
    outputFilenames.push(response.filename)
    expect(outputIds.length).toBe(3)
  }, 180000)

  it(`[${scenario.name}] list output files`, async () => {
    const response = await s3Service.find()
    expect(response.length).toBe(outputIds.length)
  })

  it(`[${scenario.name}] download output files`, async () => {
    for (const outputId of outputIds) {
      const tmpFilePath = getTmpPath(namespace, outputId)
      const response = await s3Service.downloadFile({ id: outputId, filePath: tmpFilePath })
      expect(response.id).toBeTruthy()
    }
    // check the size of the uncompressed file
    let size = fs.statSync(getTmpPath(namespace, outputIds[0])).size
    expect(size).toBe(scenario.expect.export.size)
    // zip file
    const unzipFilename = _.replace(outputFilenames[1], '.zip', '')
    await unzipFile(getTmpPath(namespace, outputIds[1]))
    size = fs.statSync(getTmpPath(namespace, unzipFilename)).size
    expect(size).toBe(scenario.expect.export.size)
    fs.unlinkSync(getTmpPath(namespace, unzipFilename))
    // tgz file
    const untarFilename = _.replace(outputFilenames[2], '.tgz', '')
    await untarFile(getTmpPath(namespace, outputIds[2]))
    size = fs.statSync(getTmpPath(namespace, untarFilename)).size
    expect(size).toBe(scenario.expect.export.size)
    fs.unlinkSync(getTmpPath(namespace, untarFilename))
  })

  it(`[${scenario.name}] clean output files`, async () => {
    for (const outputId of outputIds) {
      const response = await s3Service.remove(outputId)
      expect(response.$metadata.httpStatusCode).toBe(204)
      clearDataset(namespace, outputId)
    }
    outputIds = []
    outputFilenames = []
  })
}

describe('feathers-import-export:nominal', () => {
  beforeAll(async () => {
    app = express(feathers())
    app.use(express.json())
    app.configure(express.rest())

    for (const scenario of scenarios) {
      app.use(scenario.name, await createMongoService(scenario.name))
      expect(app.service(scenario.name)).toBeTruthy()
    }

    app.use('path-to-s3', new S3Service(options.s3Options), {
      methods: ['uploadFile', 'downloadFile']
    })
    s3Service = app.service('path-to-s3')
    expect(s3Service).toBeTruthy()

    app.use('import-export', new Service(Object.assign(options, { app })))
    service = app.service('import-export')
    expect(service).toBeTruthy()

    service.registerTransform('csv-import-transform', csvImportTransform)
    service.registerTransform('csv-export-transform', csvExportTransform)

    expressServer = await app.listen(port)
  })

  it('is ES module compatible', () => {
    expect(typeof Service).toBe('function')
  })

  for (const scenario of scenarios) runTests(scenario)

  afterAll(async () => {
    for (const scenario of scenarios) await removeMongoService(scenario.name)
    await expressServer.close()
  })
})
