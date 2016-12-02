import _ from 'lodash'
import url from 'url'
import EventEmitter from 'events'
import WSDL from './wsdl/index'
import Security from '../security/index'
import createTypes from './types'
import createServices from './services'
import cacheKey from './utils/cache-key'

const VERSION = '0.1.0'

export class SoapConnectClient extends EventEmitter {
  constructor (wsdlAddress, options, callback) {
    super()
    if (!_.isString(wsdlAddress)) throw new Error('No WSDL provided')
    if (_.isFunction(options)) {
      callback = options
      options = {}
    }
    callback = _.isFunction(callback) ? callback : () => false
    options.endpoint = options.endpoint || url.parse(wsdlAddress).host
    this.options = options
    this.options.userAgent = this.options.userAgent || `soap-connect/${VERSION}`
    this.types = {}
    this.lastResponse = null
    this._security = new Security.Security()

    if (options.ignoreSSL) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    return new Promise((resolve, reject) => {
      return cacheKey(this.options.cacheKey, wsdlAddress, (err, cacheKey) => {
        if (err) {
          callback(err)
          return reject(err)
        }
        return WSDL(wsdlAddress, options, cacheKey)
          .then((wsdlInstance) => {
            this.wsdl = wsdlInstance
            this.types = createTypes(wsdlInstance)
            this.services = createServices.call(this, wsdlInstance)
            callback(null, this)
            return resolve(this)
          })
          .catch((err) => {
            callback(err)
            return reject(err)
          })
      })
    })
  }

  setSecurity (security) {
    if (!(security instanceof Security.Security)) throw new Error('Invalid security object')
    this._security = security
  }
}

export default function (mainWSDL, options = {}, callback) {
  return new SoapConnectClient(mainWSDL, options, callback)
}