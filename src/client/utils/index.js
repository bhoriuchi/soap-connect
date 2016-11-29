import _ from 'lodash'
import url from 'url'
import { XS_NS, WSDL_NS, NODE_TYPES } from '../const'
let { ELEMENT_NODE } = NODE_TYPES

export function getQName (qname, pfx = '') {
  let [ prefix, localName ] = qname.split(':')
  if (localName) return { [`${pfx}prefix`]: prefix, [`${pfx}localName`]: localName }
  return { [`${pfx}prefix`]: '', [`${pfx}localName`]: prefix }
}

export function firstNode (nodes) {
  return _.get(nodes, '0')
}

export function filterEmpty(obj) {
  return _.omitBy(obj, (val) => {
    if (_.isArray(val) && !val.length) return true
    if (!val && val !== false) return true
  })
}

export function getOperationElement (data, node) {
  let { m_prefix, m_localName } = getQName(node.getAttribute('message'), 'm_')
  let msgNS = node.lookupNamespaceURI(m_prefix)
  let msg = _.get(data, `["${msgNS}"].messages["${m_localName}"]`)
  let part = _.first(msg.getElementsByTagNameNS(WSDL_NS, 'part'))
  let { e_prefix, e_localName } = getQName(part.getAttribute('element'), 'e_')
  let elNS = node.lookupNamespaceURI(e_prefix)
  let el = _.get(data, `["${elNS}"].elements["${e_localName}"]`)
  return el
}

export function parseRef(namespaces, node, ref) {
  let { prefix, localName } = getQName(ref)
  let name = localName
  let namespace = prefix ? node.lookupNamespaceURI(prefix) : node.namespaceURI || XS_NS
  let nsIdx = _.findIndex(namespaces, { name: namespace })
  let typeIdx = namespaces[nsIdx].types.indexOf(localName)

  // if not found, look through other namespaces
  if (typeIdx === -1) {
    _.forEach(namespaces, (n, idx) => {
      typeIdx = n.types.indexOf(localName)
      if (typeIdx !== -1) {
        nsIdx = idx
        return false
      }
    });
  }
  return [nsIdx, typeIdx];
}

export function toProperty(namespaces, node, data) {
  let obj = {}
  _.forEach(node.attributes, (attr) => {
    let name = attr.name
    let value = attr.value
    if (name === 'ref') {
      let { prefix, localName } = getQName(value)
      let elNSURI = node.lookupNamespaceURI(prefix)
      var ref = _.get(data, `["${elNSURI}"].elements["${localName}"]`)
      if (ref) {
        obj.name = ref.getAttribute('name')
        obj.type = parseRef(namespaces, ref, ref.getAttribute('type'))
      }
    } else if (name === 'type') {
      obj.type = parseRef(namespaces, node, value)
    } else {
      obj[name] = value
    }
  })
  return obj
}

export function getNodeData (node) {
  return _.get(node, 'firstChild.data') || _.get(node, 'firstChild.nodeValue')
}

export function getEndpointFromPort (client, port) {
  let svcURL = url.parse(port.address)
  if (svcURL.host.match(/localhost/i)) svcURL.host = client.options.endpoint
  return url.format(svcURL)
}

export function getFirstChildElement (node) {
  for (let key in node.childNodes) {
    let n = node.childNodes[key]
    if (n.nodeType === ELEMENT_NODE) {
      return n
    }
  }
}

export default {
  getEndpointFromPort,
  getFirstChildElement,
  getNodeData,
  getOperationElement,
  firstNode,
  filterEmpty,
  parseRef,
  toProperty,
  getQName
}