import _ from 'lodash'
import EventEmitter from 'events'
import load from './load'
import getters from './getters'
import { getType } from './parse/common'
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
    this.$$ = (v) => `${this._options.metaPrefix}${v}`

    if (options.ignoreSSL) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    return load.call(this).then((meta) => {
      fs.writeFileSync('meta.txt', JSON.stringify(meta, null, '  '))
      /*
      this._meta = meta
      let g = getters(this)

      // fs.writeFileSync('meta.json', JSON.stringify(meta, null, '  '))
      _.forEach(this._meta.services, (svc, svcName) => {
        let service = this[svcName] = {}
        _.forEach(svc.ports, (port, portName) => {
          let servicePort = service[portName] = {}
          let bindingName = getType(port[this.$$('binding')]).name
          let binding = _.get(this._meta.bindings, bindingName)
          let ns = getNS.call(this, binding[this.$$('ns')])
          _.forEach(_.get(this._meta.operations, ns), (op, opName) => {
            if (_.get(op, this.$$('binding')) === bindingName && opName) servicePort[opName] = (args) => {
              let inputMsg = g.getMessage(op.input.message)
              let inputParam = inputMsg.parts.parameters.type
              let inputParamType = g.getWsdlType(inputParam.ns, inputParam.name).$$type
              console.log(g.getWsdlType(inputParamType.ns, inputParamType.name))

              let outputMsg = g.getMessage(op.output.message)
              console.log(JSON.stringify(inputParamType, null, '  '))

              console.log(`
${this._meta[this.$$('doctype')]}

`)
            }
          })
        })
      })
*/
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