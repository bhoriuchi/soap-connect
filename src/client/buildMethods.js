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

function serializeObj (meta, obj, prefix, nsDefined = false) {
  let xml = ''
  console.log(obj)
  _.forEach(obj, (v, k) => {
    let xmlns = !nsDefined ? ` xmlns:${prefix}="${_.get(meta, `namespaces["${prefix}"].name`)}"` : ''
    xml += `<${prefix}:${k}${xmlns}>`
    // xml += serializeObj(meta, v, prefix, true)
    xml += `</${prefix}:${k}>`
  })
  return xml
}

function createRequest (meta, obj, prefix) {
  let xml = meta.$doctype
  let soap = meta.$soap

  xml += `<soap:Envelope xmlns:soap="${soap.envelope}">`
  xml += '<soap:Header/>'
  xml += '<soap:Body>'
  xml += serializeObj(meta, obj, prefix)
  xml += '</soap:Body>'
  xml += '</soap:Envelope>'

  return xml
}

export default function buildMethods (client, meta, port, portPath) {
  let { binding, address } = port
  binding = getBinding(meta, binding)

  _.forEach(binding.operations, (op, opName) => {
    _.set(client, `${portPath}["${opName}"]`, (args) => {
      // console.log(JSON.stringify(op, null, '  '))
      let input = getWsdlMessage(meta, op.input.message)
      let { prefix, name } = getType(input.parameters)
      let obj = _.get(client, `types["${prefix}"]["${name}"]`)(args)

      let req = createRequest(meta, obj, prefix)

      console.log(req)
    })
  })
}