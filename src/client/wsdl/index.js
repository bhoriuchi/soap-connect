import _ from 'lodash'
import path from 'path'
import EventEmitter from 'events'
import LocalStorage from 'node-localstorage'
import methods from './methods/index'

/*
 * Strategy adapted from vSphere JS SDK  - https://labs.vmware.com/flings/vsphere-sdk-for-javascript#summary
 */

const STORE_VERSION = '0.1.0'
const BASE_DIR = __dirname.replace(/^(.*\/soap-connect)(.*)$/, '$1')
const STORAGE_PATH = path.resolve(`${BASE_DIR}/.localStorage`)

export class WSDL extends EventEmitter {
  constructor (address, options = {}) {
    super()
    this.namespaces = {}
    this.address = address
    this.options = options
    let data = {
      actions: {},
      attributes: {},
      attributeGroups: {},
      bindings: {},
      elements: {},
      messages: {},
      operations: {},
      ports: {},
      types: {}
    }

    _.forEach(methods, (method, name) => this[name] = method.bind(this))

    return new Promise((resolve, reject) => {
      let [ resolving, loaded, store, storeCompatible ] = [ [], [], null, true ]
      let useCache = _.get(this.options, 'cache', true)
      let cache = {}

      this.on('wsdl.load.error', (err) => reject(err))
      this.on('wsdl.load.start', (doc) => resolving.push(doc))
      this.on('wsdl.load.end', (doc) => {
        let idx = resolving.indexOf(doc);
        if (idx >= 0) resolving.splice(idx, 1)
        if (!resolving.length) {
          this.removeAllListeners()

          // process wsdl
          this.processDocs(cache, data)
          this.processDef(data)

          // resolve the WSDL object
          return resolve(this)
        }
      })
      this.loadDoc(this.address, cache)
    })
  }
}

export default function (address, options = {}) {
  return new WSDL(address, options)
}