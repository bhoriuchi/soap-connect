import _ from 'lodash'
import url from 'url'
import EventEmitter from 'events'
import WSDL from './wsdl/index'
import Security from '../security/index'
import createTypes from './types'
import createServices from './services'

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
    this.types = {}
    this.lastResponse = null
    this._security = new Security.Security()

    if (options.ignoreSSL) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    return WSDL(wsdlAddress, options).then((wsdlInstance) => {
      this.wsdl = wsdlInstance
      this.types = createTypes(wsdlInstance)
      this.services = createServices.call(this, wsdlInstance)

      // return the client
      callback(this)
      return this
    })
  }

  setSecurity (security) {
    if (!(security instanceof Security.Security)) throw new Error('Invalid security object')
    this._security = security
  }
}

export default function (mainWSDL, options = {}) {
  return new SoapConnectClient(mainWSDL, options)
}