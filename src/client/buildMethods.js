import _ from 'lodash'
import { getNsByName, getType } from './common'

function getBinding (meta, binding) {
  let { prefix, name } = getType(binding)
  let ifaceNs = _.get(meta.namespaces, `["${prefix}"].name`)
  let bindingNs = _.get(getNsByName(meta, ifaceNs), 'name')
  let ns = {}
  _.forEach(meta.namespaces, (namespace) => {
    if (namespace.name === bindingNs && _.isObject(namespace.bindings)) {
      ns = namespace
      return false
    }
  })
  return _.get(ns, `bindings["${name}"]`, {})
}

function getWsdlMessage (meta, type) {
  let { prefix, name } = getType(type)
  return _.get(meta, `namespaces["${prefix}"].messages["${name}"]`)
}

export default function buildMethods (client, meta, port, portPath) {
  let doctype = meta.$doctype
  let soap = meta.$soap
  let { binding, address } = port
  binding = getBinding(meta, binding)

  _.forEach(binding.operations, (op, opName) => {
    _.set(client, `${portPath}["${opName}"]`, (args) => {
      console.log(JSON.stringify(op, null, '  '))
      let input = getWsdlMessage(meta, op.input.message)
      console.log(input)
    })
  })
}