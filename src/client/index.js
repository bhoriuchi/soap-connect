import _ from 'lodash'
import url from 'url'
import EventEmitter from 'events'
import WSDL from './wsdl/index'
/*
import load from './load'
import buildTypes from './buildTypes'
import buildMethods from './buildMethods'
*/
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
    this._options = options
    if (options.ignoreSSL) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    let loadWSDL = WSDL(wsdlAddress, options.wsdl)

    return loadWSDL.then((wsdlInstance) => {
      this._wsdl = wsdlInstance
      callback(this)
      return this
    })

    /*
    return load.call(this).then((meta) => {
      this._meta = meta
      buildTypes(this, meta)
      // fs.writeFileSync('meta.txt', JSON.stringify(meta, null, '  '))
      _.forEach(meta.namespaces, (ns) => {
        _.forEach(ns.services, (svc, svcName) => {
          _.forEach(svc, (port, portName) => {
            buildMethods(this, meta, port, `services["${svcName}"]["${portName}"]`)
          })
        })
      })
      return this
    })
    */
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