import _ from 'lodash'
import path from 'path'
import EventEmitter from 'events'
import LocalStorage from 'node-localstorage'
import methods from './methods/index'
import { getQName } from '../utils/index'

/*
 * Strategy adapted from vSphere JS SDK  - https://labs.vmware.com/flings/vsphere-sdk-for-javascript#summary
 */

const BASE_DIR = __dirname.replace(/^(.*\/soap-connect)(.*)$/, '$1')
const STORAGE_PATH = path.resolve(`${BASE_DIR}/.localStorage`)

export class WSDL extends EventEmitter {
  constructor (address, options = {}) {
    super()
    this.address = address
    this.options = options
    let data = {}

    _.forEach(methods, (method, name) => this[name] = method.bind(this))

    return new Promise((resolve, reject) => {
      let [ resolving, store, cache ] = [ [], null, {} ]
      let useCache = _.get(this.options, 'cache', true)

      if (useCache) {
        store = new LocalStorage.LocalStorage(STORAGE_PATH)
        let rawMetadata = store.getItem(this.address)
        if (rawMetadata) {
          let metadata = JSON.parse(rawMetadata)
          this.metadata = metadata
          return resolve(this)
        }
      }

      this.on('wsdl.load.error', (err) => reject(err))
      this.on('wsdl.load.start', (doc) => resolving.push(doc))
      this.on('wsdl.load.end', (doc) => {
        let idx = resolving.indexOf(doc);
        if (idx >= 0) resolving.splice(idx, 1)
        if (!resolving.length) {
          this.removeAllListeners()

          // process wsdl
          this.processDocs(cache, data)
          this.metadata = this.processDef(data)

          // store the metadata
          if (useCache && store) store.setItem(this.address, JSON.stringify(this.metadata))

          // resolve the WSDL object
          return resolve(this)
        }
      })
      this.loadDoc(this.address, cache)
    })
  }

  getType (t) {
    let [ ns, type ] = t
    return _.get(this.metadata, `types[${ns}][${type}]`)
  }

  getTypeByLocalNS (nsURI, localName) {
    let nsIdx = _.findIndex(this.metadata.namespaces, { name: nsURI })
    let ns = _.get(this.metadata.namespaces, `[${nsIdx}]`)
    let typeIdx = ns.types.indexOf(localName)
    return [ nsIdx, typeIdx ]
  }

  getTypeAttribute (node) {
    for (let key in node.attributes) {
      let n = node.attributes[key]
      if (n.localName === 'type') {
        return n
      }
    }
  }

  getOp (o) {
    let [ ns, port, op ] = o
    return _.get(this.metadata, `operations[${ns}][${port}][${op}]`)
  }

  getTypeName (t) {
    let [ ns, type ] = t
    return _.get(this.metadata, `namespaces[${ns}].types[${type}]`)
  }

  getTypeRoot (t) {
    let root = this.getType(t).base
    return root ? this.getTypeRoot(root) : t
  }

  getNSPrefix (t) {
    let [ ns ] = t
    return _.get(this.metadata, `namespaces[${ns}].prefix`)
  }

  getNSURIByPrefix (prefix) {
    return _.get(_.find(this.metadata.namespaces, { prefix }), 'name')
  }

  getTypeByQName (qname, fallbackNSURI) {
    let { prefix, localName } = getQName(qname)
    let nsURI = prefix ? this.getNSURIByPrefix(prefix) : fallbackNSURI
    return this.getTypeByLocalNS(nsURI, localName)
  }

  isBuiltInType (t) {
    let [ ns ] = t
    return _.get(this.metadata, `namespaces[${ns}].isBuiltIn`) === true
  }

  isEnumType (t) {
    return _.has(this.getType(t), 'enumerations')
  }

  isSimpleType(t) {
    return this.isBuiltInType(t) || this.isEnumType(t)
  }

  isMany (typeDef) {
    if (!typeDef.maxOccurs) return false
    let maxOccurs = typeDef.maxOccurs === 'unbounded' ? 2 : Number(maxOccurs)
    return maxOccurs > 1
  }

  isRequired (typeDef) {
    return Number(typeDef.minOccurs) > 0
  }

  convertValue (type, value) {
    if (this.isEnumType(type)) return value
    let t = this.getType(type)
    return t.convert ? t.convert(value) : value
  }
}

export default function (address, options = {}) {
  return new WSDL(address, options)
}