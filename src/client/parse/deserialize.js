import _ from 'lodash'
import xmldom from 'xmldom'
import { getTag, getPrefixByNS, getType } from '../common'
import { XSD_NS, XSI_NS } from './const'

export function parseType (meta, obj, nsMap, ns, tag) {
  let prefix = getPrefixByNS(meta, nsMap[ns])
  let type = _.get(client._meta.namespaces, `["${prefix}"].types["${tag}"]`)
  _.forEach(type.props, (prop, propName) => {
    let propType = getType(prop.type)
  })
}

export function parse (client, obj, payload) {
  let { el, nsMap, soap, soapenv } = payload

  _.forEach(el.childNodes, (child) => {
    let { ns, tag } = getTag(child)

    let parseChildren = (data = {}) => {
      parse(client, obj, _.merge({}, payload, { el: child, parent: tag }, data))
    }

    switch (tag) {
      case 'Envelope':
        if (!_.keys(nsMap).length) {
          nsMap = child._nsMap || {}
          _.forEach(nsMap, (ns, name) => {
            if (ns === soap.envelope) soapenv = name
          })
        }
        if (ns === soapenv) {
          parseChildren({ nsMap, soapenv })
        }
        break
      case 'Body':
        if (ns === soapenv) {
          parseChildren()
        }
        break
      case '#text':
        break
      default:
        nsMap = _.merge(nsMap, child._nsMap)
        if (soapenv) {

        }
        break
    }
  })
}

export default function deserialize (client, body, res) {
  let soap = client._meta.$soap
  let obj = {}
  let el = new xmldom.DOMParser().parseFromString(body)
  parse(client, obj, { el, soap })
  return body
}