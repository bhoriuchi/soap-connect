import _ from 'lodash'
import EventEmitter from 'events'
import request from 'request'
import xmldom from 'xmldom'
import parse from './parse'

export class WSDL extends EventEmitter {
  constructor (address, options = {}) {
    super()
    this.doctype = '<?xml version="1.0" encoding="utf-8"?>'
    this.namespaces = {}
    this.address = address
    this.options = options

    return new Promise((resolve, reject) => {
      let [ resolving, loaded ] = [ [], [] ]
      /*
       let useCache = _.get(this._options, 'cache', true)
       let store = new LocalStorage.LocalStorage(STORAGE_PATH)
       let cache = store.getItem(uri)
       if (cache && useCache) return resolve(JSON.parse(cache))
       */
      this.on('wsdl.load.error', (err) => reject(err))
      this.on('wsdl.load.start', (doc) => resolving.push(doc))
      this.on('wsdl.load.end', (doc) => {
        let idx = resolving.indexOf(doc);
        if (idx >= 0) resolving.splice(idx, 1)
        if (!resolving.length) {
          this.removeAllListeners()
          // mergeOperations(meta)
          // store.setItem(uri, JSON.stringify(meta))
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

  parse () {
    return parse.apply(this, arguments)
  }
}

export default function (address, options = {}) {
  return new WSDL(address, options)
}