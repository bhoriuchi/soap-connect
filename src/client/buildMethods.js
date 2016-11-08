import _ from 'lodash'
import request from 'request'
import url from 'url'
import { getNsByName, getType } from './common'
import deserialize from './parse/deserialize'

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
  _.forEach(obj, (v, k) => {
    let xmlns = !nsDefined ? ` xmlns:${prefix}="${_.get(meta, `namespaces["${prefix}"].name`)}"` : ''
    let attrs = []
    _.forEach(v, (attr, attrName) => {
      if (attrName.match(/^@.*/)) {
        attrName = attrName.replace(/^@(.*)/, '$1')
        attrs.push(`${attrName}="${attr}"`)
      }
    })
    let attrStr = attrs.length ? ` ${attrs.join(', ')}` : ''
    xml += `<${prefix}:${k}${xmlns}${attrStr}>`
    xml += _.has(v, '$value') ? v.$value : serializeObj(meta, v, prefix, true)
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
  let svcURL = url.parse(address)
  if (svcURL.host.match(/localhost/i)) svcURL.host = client._endpoint
  binding = getBinding(meta, binding)

  _.forEach(binding.operations, (op, opName) => {
    _.set(client, `${portPath}["${opName}"]`, (args, callback = () => false) => {
      return new Promise((resolve, reject) => {
        try {
          let input = getWsdlMessage(meta, op.input.message)
          let { prefix, name } = getType(input.parameters)
          let obj = _.get(client, `types["${prefix}"]["${name}"]`)(args)
          let reqBody = createRequest(meta, obj, prefix)

          request.post({
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': reqBody.length
            },
            url: url.format(svcURL),
            body: reqBody
          }, (err, res, body) => {
            if (err) {
              callback(err)
              return reject(err)
            }
            let obj = deserialize(client, body, res)
            callback(null, obj)
            return resolve(obj)
          })
        } catch (err) {
          callback(err)
          return reject(err)
        }
      })
    })
  })
}