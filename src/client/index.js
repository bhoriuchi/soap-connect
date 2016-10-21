import _ from 'lodash'
import EventEmitter from 'events'
import load from './load'
import { getType } from './parse/common'
import fs from 'fs'

export class SoapConnectClient extends EventEmitter {
  constructor (mainWSDL, options = {}) {
    super()
    if (!mainWSDL) throw new Error('No WSDL provided')

    this._mainWSDL = mainWSDL
    this._options = options
    this._options.metaPrefix = this._options.metaPrefix || '$$'
    this._meta = {}
    this.$$ = (v) => `${this._options.metaPrefix}${v}`
    this._meta[this.$$('doctype')] = '<?xml version="1.0" encoding="utf-8"?>'

    if (options.ignoreSSL) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    return load.call(this).then((meta) => {
      this._meta = meta
      fs.writeFileSync('meta.json', JSON.stringify(meta, null, '  '))
      _.forEach(this._meta.services, (svc, svcName) => {
        let service = this[svcName] = {}
        _.forEach(svc.ports, (port, portName) => {
          let servicePort = service[portName] = {}
          let bindingName = getType(port[this.$$('binding')]).name
          let binding = _.get(this._meta.bindings, bindingName)
          let ns = _.get(this._meta, `types["${this.$$('nsMap')}"]["${binding[this.$$('ns')]}"]`)
          _.forEach(_.get(this._meta.operations, ns), (op, opName) => {
            if (_.get(op, this.$$('binding')) === bindingName && opName) servicePort[opName] = {}
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