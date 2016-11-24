import _ from 'lodash'
import url from 'url'
import EventEmitter from 'events'
import WSDL from './wsdl/index'
import Security from '../security/index'
import buildServices from './buildServices'
import buildTypes from './buildTypes'

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
    this.services = {}
    this.lastResponse = null
    this._security = new Security.Security()

    if (options.ignoreSSL) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    let loadWSDL = WSDL(wsdlAddress, options)

    return loadWSDL.then((wsdlInstance) => {
      this.wsdl = wsdlInstance
      buildTypes(this)
      this.services = buildServices(this)

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

/*

 <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
 <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
   <soap:Header/>
   <soap:Body>
     <ns1:RetrieveServiceContent xmlns:ns1="urn:vim25">
      <ns1:_this>ServiceInstance</ns1:_this>
     </ns1:RetrieveServiceContent>
   </soap:Body>
 </soap:Envelope>
 */