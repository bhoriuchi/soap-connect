import _ from 'lodash'
import { XS_NS, WSDL_NS } from '../../const'
import { getBuiltinNSMeta } from '../namespaces/index'
import { toProperty, parseRef, filterEmpty, getQName, getOperationElement } from '../utils/index'
import fs from 'fs'

function getTypes (data, namespaces, types) {
  return _.map(types, (type) => {
    let [ attributes, elements, maxOccurs, minOccurs ] = [ [], [], null, null ]
    let [ base, enumerations, unions ] = [ undefined, [], [] ]

    _.forEach(type.childNodes, (node) => {
      switch (node.localName) {
        case 'sequence':
        case 'choice':
        case 'all':
          maxOccurs = node.getAttribute('maxOccurs') || maxOccurs
          minOccurs = node.getAttribute('minOccurs') || minOccurs
      }
    })

    // process XSD elements
    _.forEach(type.getElementsByTagNameNS(XS_NS, 'element'), (node) => {
      let el = toProperty(namespaces, node, data)
      if (node.parentNode.localName === 'choice') {
        el.minOccurs = '0'
        maxOccurs = node.parentNode.getAttribute('maxOccurs') || maxOccurs
      }
      elements.push(el)
    })

    // process XSD anys
    _.forEach(type.getElementsByTagNameNS(XS_NS, 'any'), (node) => {
      elements.push(toProperty(namespaces, node, data))
    })

    // process attributes
    _.forEach(type.getElementsByTagNameNS(XS_NS, 'attribute'), (node) => {
      attributes.push(toProperty(namespaces, node, data))
    })

    // process anyAttributes
    _.forEach(type.getElementsByTagNameNS(XS_NS, 'anyAttribute'), (node) => {
      attributes.push(toProperty(namespaces, node, data))
    })

    // process attributeGroup
    _.forEach(type.getElementsByTagNameNS(XS_NS, 'attributeGroup'), (node) => {
      let { prefix, localName } = getQName(node.getAttribute('ref'))
      let groupNSURI = node.lookupNamespaceURI(prefix)
      let attrGroup = _.get(data, `["${groupNSURI}"].attributeGroups`, localName)
      _.forEach(attrGroup.getElementsByTagNameNS(XS_NS, 'attribute'), (node) => {
        attributes.push(toProperty(namespaces, node, data))
      })
      _.forEach(attrGroup.getElementsByTagNameNS(XS_NS, 'anyAttribute'), (node) => {
        attributes.push(toProperty(namespaces, node, data))
      })
    })

    // process extension
    let extension = _.get(type.getElementsByTagNameNS(XS_NS, 'extension'), '[0]')
    if (_.has(extension, 'getAttribute')) {
      base = parseRef(namespaces, extension, extension.getAttribute('base'))
    }

    // process enums
    if (type.localName === 'simpleType') {
      _.forEach(type.getElementsByTagNameNS(XS_NS, 'restriction'), (node) => {
        _.forEach(node.getElementsByTagNameNS(XS_NS, 'enumeration'), (e) => {
          enumerations.push(e.getAttribute('value'))
        })
      })
      _.forEach(type.getElementsByTagNameNS(XS_NS, 'union'), (node) => {
        _.forEach(type.getElementsByTagNameNS(XS_NS, 'memberTypes').split(/\s+/g), (t) => {
          unions.push(parseRef(namespaces, node, t))
        })
      })
    }
    return filterEmpty({ attributes, base, elements, enumerations, maxOccurs, minOccurs, unions })
  })
}

function getPortOperations (data, namespace, port) {
  let { prefix } = getQName(port.getAttribute('binding'))
  let bindingNS = prefix ? port.lookupNamespaceURI(prefix) : namespace
  let binding = _.get(data, `["${bindingNS}"].binding`)
  if (!binding) return []
  return _.map(binding.getElementsByTagNameNS(binding.namespaceURI, 'operation'), (op) => {
    return op.getAttribute('name')
  })
}

function getPorts (data, namespace, def) {
  return _.map(def.ports, (port, name) => {
    return {
      name,
      service: port.parentNode.getAttribute('name'),
      operations: getPortOperations(data, namespace, port).sort()
    }
  })
}


export default function processDef (data) {
  let [ operations, services, types ] = [ [], [], [] ]
  let namespaces = getBuiltinNSMeta()

  // add empty array objects for each builtin type
  // to keep indexes in sync
  _.forEach(namespaces, () => {
    operations.push([])
    services.push([])
    types.push([])
  })

  // get types and operations by namespace
  _.forEach(data, (def, name) => {
    namespaces.push({
      name,
      ports: getPorts(data, name, def),
      services: [],
      types: _.keys(def.types).sort()
    })
  })

  // add types
  _.forEach(data, (def) => types.push(getTypes(data, namespaces, def.types)))

  // add operations
  _.forEach(data, (def) => {
    let ops = []
    if (_.keys(def.ports).length) {
      _.forEach(def.ports, (port) => {
        let { prefix } = getQName(port.getAttribute('binding'))
        let portNS = port.lookupNamespaceURI(prefix)
        let binding = _.get(data, `["${portNS}"].binding`)
        let portOps = _.map(binding.getElementsByTagNameNS(binding.namespaceURI, 'operation'), (op) => {
          return op.getAttribute('name')
        })
        _.forEach(portOps, (name) => {
          let node = _.get(data, `["${portNS}"].operations["${name}"]`)
          let input = getOperationElement(data, _.first(node.getElementsByTagNameNS(WSDL_NS, 'input')))
          let output = getOperationElement(data, _.first(node.getElementsByTagNameNS(WSDL_NS, 'output')))
          ops.push([
            {
              action: _.get(data, `["${portNS}"].actions["${name}"]`).getAttribute('soapAction'),
              name: input.getAttribute('name'),
              type: parseRef(namespaces, input, input.getAttribute('type'))
            },
            {
              type: parseRef(namespaces, output, output.getAttribute('type'))
            }
          ])
        })
      })
    }
    operations.push(ops)
  })
  console.log('write file', new Date())
  fs.writeFileSync('test-meta.txt', JSON.stringify({ namespaces, operations, services, types }, null, '  '))

  return { namespaces, operations, services, types }
}