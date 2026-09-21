import { byte, promise } from '@kalisio/common-core/utilities'
import { request } from '@kalisio/common-core/operators/request'

export class ClientHelpers {
  constructor (app, service, options) {
    this.app = app
    this.service = service
    this.proxy = options.useProxy
    this.atob = options.atob || byte.fromBase64Bytes
    this.btoa = options.btoa || byte.toBase64
    this.requestOptions = options.request || {}
    this.concurrency = options.concurrency || 4
    this.debug = (message) => {
      if (options.debug) options.debug(message)
    }
  }

  async upload (id, blob, options, params = {}) {
    if (blob.size > this.service.chunkSize) {
      this.debug(`multipart upload for file with 'id': ${id}`)
      return this.multipartUpload(id, blob, options, params)
    }
    this.debug(`singlepart upload for file with 'id': ${id}`)
    return this.singlePartUpload('PutObject', id, blob, options, params)
  }

  async multipartUpload (id, blob, options, params = {}) {
    // check arguments
    if (!id) throw new Error('multipartUpload: missing \'id\'')
    if (!blob) throw new Error('multipartUpload: missing \'blob\'')
    if (!blob.type) throw new Error('multipartUpload: missing \'blob.type\'')
    this.debug(`multipartUpload called with 'id': ${id}`)
    // initialize the multipart upload
    const { UploadId } = await this.service.createMultipartUpload({ id, type: blob.type }, params)
    this.debug(`multipart upload created with 'UploadId': ${UploadId}`)
    // slice the blob into parts, one upload task per part
    const tasks = []
    let offset = 0
    while (offset < blob.size) {
      const end = Math.min(offset + this.service.chunkSize, blob.size)
      const chunk = blob.slice(offset, end, blob.type)
      const PartNumber = tasks.length + 1
      tasks.push(async () => {
        this.debug(`upload part with number: ${PartNumber} and UploadId: ${UploadId}`)
        const { ETag } = await this.singlePartUpload('UploadPart', id, chunk, {
          ...options,
          UploadId,
          PartNumber
        }, params)
        return { PartNumber, ETag }
      })
      offset = end
    }
    // upload parts with bounded concurrency — run() keeps task order
    const parts = await promise.run(tasks, { concurrency: this.concurrency })
    // finalize the multipart upload
    this.debug(`complete multipart upload with UploadId: ${UploadId}`)
    return this.service.completeMultipartUpload({ id, UploadId, parts }, params)
  }

  async singlePartUpload (command, id, blob, options, params = {}) {
    // check arguments
    if (!command) throw new Error('singlePartUpload: missing \'command\'')
    if (!id) throw new Error('singlePartUpload: missing \'id\'')
    if (!blob) throw new Error('singlePartUpload: missing \'blob\'')
    if (!blob.type) throw new Error('singlePartUpload: missing \'blob.type\'')
    this.debug(`singlePartUpload called with 'command': ${command} and 'id': ${id}`)
    // handle proxy case if needed
    if (this.proxy) {
      this.debug('singlePartUpload uses proxy')
      let buffer = await blob.arrayBuffer()
      // Need to convert array buffer to something serializable in JSON
      buffer = this.btoa(buffer)
      const data = { id, buffer, type: blob.type, ...options }
      if (command === 'UploadPart') return await this.service.uploadPart(data, params)
      return await this.service.putObject(data, params)
    }
    // create the signedUrl to upload the blob
    const { SignedUrl } = await this.service.create({ command, id, ...options }, params)
    this.debug(`singlePartUpload uses signedUrl ${SignedUrl}`)
    const requester = request(this.requestOptions)
    const response = await requester.fetch(SignedUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': blob.type
      }
    })
    const etag = response.headers.get('etag')
    this.debug(`singlePartUpload succeeded with ETag ${etag}`)
    return { ETag: etag }
  }

  async download (id, options, params = {}) {
    // check arguments
    if (!id) throw new Error('download: \'id\' argument must be provided')
    this.debug(`download called with 'id': ${id}`)
    // handle proxy case if needed
    if (this.proxy) {
      this.debug('download uses proxy')
      const response = await this.service.get(id, params)
      response.buffer = this.atob(response.buffer)
      return response
    }
    // use a signedurl
    const { SignedUrl } = await this.service.create({ id, command: 'GetObject', ...options }, params)
    this.debug(`download uses signedUrl ${SignedUrl}`)
    const requester = request(this.requestOptions)
    const response = await requester.fetch(SignedUrl, {
      method: 'GET'
    })
    const type = response.headers.get('content-type')
    const buffer = await response.arrayBuffer()
    this.debug('download succeeded')
    return { buffer, type }
  }
}
