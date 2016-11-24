import _ from 'lodash'
import { getQName } from '../utils/index'
import { XS_NS, WSDL_NS, SOAP } from '../../const'

// set operations via interface or portType
function setOperations (operations, portType) {
  _.forEach(portType.childNodes, (node) => {
    if (node.localName === 'operation') operations[node.getAttribute('name')] = node
  })
}

function processDoc (doc, data) {
  /*
   * PROCESS DEFINITIONS
   */
  let definitions = doc.getElementsByTagNameNS(WSDL_NS, 'definitions')
  _.forEach(definitions, (node) => {
    let ns = node.getAttribute('targetNamespace')
    let nsData = data[ns] = data[ns] || {}
    nsData.$prefix = _.findKey(node._nsMap, (o) => o === ns)
    nsData.actions = nsData.actions || {}
    nsData.messages = nsData.messages || {}
    nsData.operations = nsData.operations || {}
    nsData.ports = nsData.ports || {}

    _.forEach(node.childNodes, (node) => {
      switch (node.localName) {
        case 'binding':
          nsData.binding = node
          _.forEach(node.childNodes, (node) => {
            if (node.localName === 'operation') {
              let op = node.getAttribute('name')
              _.forEach(node.childNodes, (node) => {
                if (node.localName === 'operation') nsData.actions[op] = node
              })
            }
          })
          break
        case 'message':
          nsData.messages[node.getAttribute('name')] = node
          break
        case 'portType':
          setOperations(nsData.operations, node)
          break
        case 'interface':
          setOperations(nsData.operations, node)
          break
        case 'service':
          _.forEach(node.childNodes, (node) => {
            if (node.localName === 'port') {
              nsData.ports[node.getAttribute('name')] = node
              _.forEach(node.childNodes, (child) => {
                if (child.localName === 'address') {
                  let { prefix } = getQName(child.tagName || child.nodeName)
                  let soapNS = child.lookupNamespaceURI(prefix)
                  if (_.includes(_.keys(SOAP), soapNS)) {
                    node.$address = child.getAttribute('location')
                    node.$soapVersion = _.get(SOAP, `["${soapNS}"].version`, '1.1')
                  }
                }
              })
            }
          })
          break
      }
    })
  })

  /*
   * PROCESS SCHEMAS
   */
  let schemas = doc.getElementsByTagNameNS(XS_NS, 'schema')
  _.forEach(schemas, (node) => {
    let ns = node.getAttribute('targetNamespace')
    let nsData = data[ns] = data[ns] || {}
    nsData.attributes = nsData.attributes || {}
    nsData.types = nsData.types || {}
    nsData.elements = nsData.elements || {}
    nsData.attributeGroups = nsData.attributeGroups || {}

    _.forEach(node.childNodes, (node) => {
      switch (node.localName) {
        case 'attribute':
          nsData.attributes[node.getAttribute('name')] = node
          break
        case 'complexType':
        case 'simpleType':
          nsData.types[node.getAttribute('name')] = node
          break
        case 'element':
          let name = node.getAttribute('name')
          let el = nsData.elements[name] = node
          _.forEach(node.childNodes, (node) => {
            if (_.includes(['complexType', 'simpleType'], node.localName)) {
              node.setAttribute('name', name)
              el.setAttribute('type', `${node.lookupPrefix(ns)}:${name}`)
              nsData.types[name] = node
            }
          })
          break
        case 'attributeGroup':
          nsData.attributeGroups[node.getAttribute('name')] = node
          break
      }
    })
  })
}

export default function processDocs (cache, data) {
  _.forEach(cache, (doc) => processDoc(doc, data))
}