import _ from 'lodash'
import { SOAP_DEFINITION } from './parse/const'
import { getType } from './parse/common'

export function getSoapConst () {
  let soapNS = _.get(this._meta, `types["${this.$$('nsMap')}"].soap`)
  return SOAP_DEFINITION[soapNS]
}

export function getWsdlType (ns, type) {
  return _.get(this._meta, `types["${getNS.call(this, ns)}"]["${type}"]`)
}

export function getNS (ns) {
  return _.get(this._meta, `types["${this.$$('nsMap')}"]["${ns}"]`)
}

export function getMessage (msg) {
  let { ns, name } = getType(msg)
  return _.get(this._meta, `messages["${getNS.call(this, ns)}"]["${name}"]`)
}

export default function (client) {
  return {
    getWsdlType: getWsdlType.bind(client),
    getSoapConst: getSoapConst.bind(client),
    getMessage: getMessage.bind(client),
    getNS: getNS.bind(client)
  }
}