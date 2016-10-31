import _ from 'lodash'
import EventEmitter from 'events'
import load from './load'
import getters from './getters'
import { mergeOperations } from './parse/common'
import fs from 'fs'

export function getNS (ns) {
  return _.get(this._meta, `types["${this.$$('nsMap')}"]["${ns}"]`)
}

export class SoapConnectClient extends EventEmitter {
  constructor (mainWSDL, options = {}) {
    super()
    if (!mainWSDL) throw new Error('No WSDL provided')

    this._mainWSDL = mainWSDL
    this._options = options
    this._options.metaPrefix = this._options.metaPrefix || '$$'
    this._meta = {
      $doctype: '<?xml version="1.0" encoding="utf-8"?>',
      namespaces: {}
    }

    if (options.ignoreSSL) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    return load.call(this).then((meta) => {
      mergeOperations(meta)

      fs.writeFileSync('meta.txt', JSON.stringify(meta, null, '  '))

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