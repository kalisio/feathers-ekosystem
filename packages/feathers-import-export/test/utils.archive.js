import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { promisify } from 'node:util'
import { pipeline } from 'node:stream'
import unzipper from 'unzipper'
const tar = await import('tar')

export async function gunzipFile (inputFilePath, outputFilePath) {
  fs.mkdirSync(path.dirname(outputFilePath), { recursive: true })
  await promisify(pipeline)(
    fs.createReadStream(inputFilePath),
    zlib.createUnzip(),
    fs.createWriteStream(outputFilePath)
  )
}

export async function unzipFile (inputFilePath) {
  await new Promise((resolve, reject) => {
    fs.createReadStream(inputFilePath)
      .pipe(unzipper.Extract({ path: path.dirname(inputFilePath) }))
      .on('close', resolve)
      .on('error', reject)
  })
}

export async function untarFile (inputFilePath) {
  await tar.x({
    file: inputFilePath,
    C: path.dirname(inputFilePath)
  })
}
