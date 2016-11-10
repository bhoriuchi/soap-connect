import _ from 'lodash'
import path from 'path'
import EventEmitter from 'events'
import LocalStorage from 'node-localstorage'
import request from 'request'
import xmldom from 'xmldom'
import parse from './parse'

const BASE_DIR = __dirname.replace(/^(.*\/soap-connect)(.*)$/, '$1')
const STORAGE_PATH = path.resolve(`${BASE_DIR}/.localStorage`)

export class WSDL extends EventEmitter {
  constructor (address, options = {}) {
    super()
    this.doctype = '<?xml version="1.0" encoding="utf-8"?>'
    this.namespaces = {}
    this.address = address
    this.options = options

    return new Promise((resolve, reject) => {
      let [ resolving, loaded, store ] = [ [], [], null ]
      let useCache = _.get(this.options, 'cache', true)

      if (useCache) {
        store = new LocalStorage.LocalStorage(STORAGE_PATH)
        let cache = store.getItem(this.address)
        if (cache) {
          let meta = JSON.parse(cache)
          this.doctype = meta.doctype || this.doctype
          this.namespaces = meta.namespaces || this.namespaces
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
          this.mergeOperations()
          if (useCache && store) {
            store.setItem(this.address, JSON.stringify({
              doctype: this.doctype,
              namespaces: this.namespaces
            }))
          }
          return resolve(this)
        }
      })
      this.loadDocument(this.address, loaded, {})
    })
  }

  loadDocument (uri, loaded, context = {}) {
    if (!_.includes(loaded, uri)) {
      console.log('loading', uri)
      this.emit('wsdl.load.start', uri)
      request(uri, (err, res, body) => {
        if (err || res.statusCode !== 200) return this.emit('wsdl.load.error', err || body || res)
        let baseURI = `${uri.substring(0, uri.lastIndexOf('/'))}/`
        let el = new xmldom.DOMParser().parseFromString(body)
        this.parse(loaded, _.merge({}, context, { baseURI, el }))
        loaded.push(uri)
        this.emit('wsdl.load.end', uri)
      })
    }
  }

  splitType (type) {
    let [prefix, name] = type.indexOf(':') !== -1 ? type.split(':') : ['', type]
    return { prefix, name }
  }

  getNsInfoByType (type) {
    let { prefix, name } = this.splitType(type)
    let ns = this.getNsByPrefix(prefix)
    return { ns, prefix, name }
  }

  getTypeWsdl (type) {
    let { name, ns } = this.getNsInfoByType(type)
    return _.get(this, `namespaces["${ns}"].types["${name}"]`, {})
  }

  getMsgWsdl (msg) {
    let { ns, name } = this.getNsInfoByType(msg)
    return _.get(this, `namespaces["${ns}"].messages["${name}"]`, {})
  }

  getTag (el, nsMap) {
    let t = _.get(el, 'tagName') || _.get(el, 'nodeName')
    if (!t) throw new Error('No tag found')
    let { prefix, name } = this.splitType(t)
    let ns = _.get(nsMap, `["${prefix}"]`)
    return { prefix, tag: name, ns }
  }

  getNsByPrefix (prefix) {
    for (const nsName in this.namespaces) {
      if (_.includes(_.get(this.namespaces, `["${nsName}"].$alias`), prefix)) return nsName
    }
  }

  getBinding (binding) {
    let { name, ns } = this.getNsInfoByType(binding)
    return _.get(this.namespaces, `["${ns}"].bindings["${name}"]`)
  }

  mergeOperations () {
    _.forEach(this.namespaces, (namespace) => {
      _.forEach(namespace.bindings, (binding) => {
        let { name, ns } = this.getNsInfoByType(binding.type)
        let operations = _.get(this, `namespaces["${ns}"].interfaces["${name}"].operations`)
        _.merge(binding.operations, operations)
      })
    })
    _.forEach(this.namespaces, (namespace) => {
      delete namespace.interfaces
    })
  }

  parse () {
    return parse.apply(this, arguments)
  }
}

export default function (address, options = {}) {
  return new WSDL(address, options)
}