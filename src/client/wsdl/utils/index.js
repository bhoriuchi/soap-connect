import _ from 'lodash'
import { XS_NS, WSDL_NS } from '../../const'

export function getQName (qname, pfx = '') {
  let [ prefix, localName ] = qname.split(':')
  if (localName) return { [`${pfx}prefix`]: prefix, [`${pfx}localName`]: localName }
  return { [`${pfx}prefix`]: '', [`${pfx}localName`]: prefix }
}

export function filterEmpty(obj) {
  return _.omitBy(obj, (val) => {
    if (_.isArray(val) && !val.length) return true
    if (!val && val !== false) return true
  })
  /*
  return _.keys(obj).reduce((previous, current) => {
    let value = obj[current]
    if (_.isArray(value)) {
      if (value.length) previous[current] = value
    } else if (value) {
      previous[current] = value
    }
    return previous
  }, {})
  */
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

export default {
  getOperationElement,
  filterEmpty,
  parseRef,
  toProperty,
  getQName
}