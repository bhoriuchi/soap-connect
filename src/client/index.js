import _ from 'lodash'
import EventEmitter from 'events'
import load from './load'
import buildMethods from './buildMethods'
// import fs from 'fs'

export class SoapConnectClient extends EventEmitter {
  constructor (mainWSDL, options = {}) {
    super()
    if (!mainWSDL) throw new Error('No WSDL provided')

    this._mainWSDL = mainWSDL
    this._options = options
    this._meta = { $doctype: '<?xml version="1.0" encoding="utf-8"?>', namespaces: {} }
    if (options.ignoreSSL) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    return load.call(this).then((meta) => {
      this._meta = meta
      // fs.writeFileSync('meta.txt', JSON.stringify(meta, null, '  '))
      _.forEach(meta.namespaces, (ns) => {
        _.forEach(ns.services, (svc, svcName) => {
          _.forEach(svc, (port, portName) => {
            buildMethods(this, meta, port, `["${svcName}"]["${portName}"]`)
          })
        })
      })
      return this
    })
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