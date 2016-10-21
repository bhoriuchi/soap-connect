import _ from 'lodash'
import path from 'path'
import LocalStorage from 'node-localstorage'
import request from 'request'
import xmldom from 'xmldom'
import parse from './parse/index'

const BASE_DIR = __dirname.replace(/^(.*\/soap-connect)(.*)$/, '$1')
const STORAGE_PATH = path.resolve(`${BASE_DIR}/.wsdlCache`)

export function loadDocument ({ client, uri, meta, loaded, payload }) {
  if (_.includes(loaded, uri)) return
  client.emit('wsdl.load.start', uri)

  request(uri, (err, res, body) => {
    if (err || res.statusCode !== 200) return client.emit('wsdl.load.error', err || body || res)
    let baseURI = `${uri.substring(0, uri.lastIndexOf('/'))}/`
    let el = new xmldom.DOMParser().parseFromString(body)
    parse(client, meta, loaded, _.merge({}, payload, { baseURI, el }))
    loaded.push(uri)
    client.emit('wsdl.load.end', uri)
  })
}

export default function load () {
  return new Promise((resolve, reject) => {
    let [ resolving, loaded, meta, uri, client ] = [ [], [], this._meta, this._mainWSDL, this ]
    let useCache = _.get(this._options, 'cache', true)
    let store = new LocalStorage.LocalStorage(STORAGE_PATH)
    let cache = store.getItem(uri)

    if (cache && useCache) return resolve(JSON.parse(cache))

    this.on('wsdl.load.error', (err) => reject(err))
    this.on('wsdl.load.start', (doc) => resolving.push(doc))
    this.on('wsdl.load.end', (doc) => {
      let idx = resolving.indexOf(doc);
      if (idx >= 0) resolving.splice(idx, 1)
      if (!resolving.length) {
        this.removeAllListeners()
        if (useCache) store.setItem(uri, JSON.stringify(meta))
        return resolve(meta)
      }
    })
    loadDocument({ client, meta, uri, loaded, payload: {} })
  })
}