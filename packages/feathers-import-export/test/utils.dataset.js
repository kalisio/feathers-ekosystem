import fs from 'node:fs'
import { gunzipFile } from './utils.archive.js'

const dataPath = './test/data'
const tmpPath = './test/tmp'

export function getTmpPath (namespace, dataset) {
  return `${tmpPath}/${namespace}/${dataset}`
}

export async function gunzipDataset (namespace, dataset) {
  const inputFilePath = `${dataPath}/${dataset}.gz`
  const outputFilePath = getTmpPath(namespace, dataset)
  return gunzipFile(inputFilePath, outputFilePath)
}

export function clearDataset (namespace, dataset) {
  fs.unlinkSync(getTmpPath(namespace, dataset))
}
