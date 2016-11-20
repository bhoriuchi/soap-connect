import _ from 'lodash'
import url from 'url'
import request from 'request'
import xmldom from 'xmldom'
import { SOAP, XS } from './const'

export function formatXML (xml) {
  return xml.replace(/(>)\s*(<)(\/*)/g, '$1\r\n$2$3')
}

export function getEndpointFromPort (client, port) {
  let svcURL = url.parse(_.get(port, `$address.location`))
  if (svcURL.host.match(/localhost/i)) svcURL.host = client.options.endpoint
  return url.format(svcURL)
}

export function getMsgElement (wsdl, msg) {
  return _.get(wsdl.getMsgWsdl(msg), 'parts.parameters.element')
}

export function getSoapDefinition (binding) {
  return _.get(SOAP, _.get(binding, '$binding.$ns'))
}

export function makeIndent (levels = 0, fill = '  ') {
  return (new Array(levels)).fill(fill, 0, levels).join('')
}

export function serialize (obj, indent = 0) {
  let xml = ''
  _.forEach(_.omit(obj, ['$attributes']), (o, tag) => {
    let attrStr = _.map(o.$attributes, (attr, attrName) => `${attrName}="${attr}"`).join(' ')
    attrStr = attrStr && indent ? ` ${attrStr}` : ''
    xml += `<${tag}${attrStr}>`
    if (!_.isObject(o)) {
      xml += o
    } else if (o.$value) {
      xml += o.$value
    } else if (_.isArray(o)) {
      _.forEach(o, (i) => {
        xml += !_.isObject(i) ? i : serialize(i, 1)
      })
    } else {
      xml += !_.isObject(o) ? o : serialize(o, 1)
    }
    xml += `</${tag}>`
  })
  return xml
}

export function mapAttributes (el) {
  let attrs = {}
  _.forEach(el.attributes, (attr) => {
    let { name, value } = attr
    if (name && value !== undefined) attrs[name] = value
  })
  if (_.keys(attrs).length) return attrs
}

export function deserialize (el) {
  let j = {}
  _.forEach(el.childNodes, (node) => {
    if (node.localName) {
      let first = _.get(node, 'firstChild.data')
      if (first !== undefined && !_.isObject(first)) {
        let subAttrs = mapAttributes(node)
        j[node.localName] = subAttrs ? { $attributes: subAttrs, $value: first } : first
      } else if (node.data !== undefined && !_.isObject(node.data)) {
        j[node.localName] = node.data
      } else if (node.data === undefined) {
        j[node.localName] = deserialize(node)
      }
    } else if (_.isString(node.data) && node.data.replace(/\s*/) !== '') {
      j.$value = node.data
    }
  })

  return j
}

export function soapOperation (client, endpoint, op, soap, nsList) {
  let wsdl = client.wsdl

  return (args = {}, options, callback) => {
    let st = Date.now()
    if (_.isFunction(options)) {
      callback = options
      options = {}
    }
    options = options || {}
    callback = _.isFunction(callback) ? callback : () => false
    return new Promise((resolve, reject) => {
      try {
        let xml = ''
        let inputEl = getMsgElement(wsdl, _.get(op, 'input.message'))
        let outputEl = wsdl.splitType(getMsgElement(wsdl, _.get(op, 'output.message'))).name
        let { prefix, name, ns } = wsdl.getNsInfoByType(inputEl)
        let typeFn = _.get(client, `types["${prefix}"]["${name}"]`)
        let typeObj = typeFn(args)
        let body = serialize(typeObj)

        xml += wsdl.doctype
        xml += `<soapenv:Envelope xmlns="${XS}" xmlns:soapenv="${soap.envelope}" ${nsList.join(' ')}>`
        xml += `<soapenv:Header/>`
        xml += `<soapenv:Body>`
        xml += body
        xml += `</soapenv:Body>`
        xml += `</soapenv:Envelope>`

        request.post({
          headers: {
            'Content-Type': soap.contentType,
            'Content-Length': xml.length
          },
          url: endpoint,
          body: xml
        }, (err, res, body) => {
          if (err) {
            callback(err)
            return reject(err)
          }

          let doc = deserialize(new xmldom.DOMParser().parseFromString(body.replace(/\n/g, '')))
          let fault = _.get(doc, 'Envelope.Body.Fault')
          if (fault) {
            let fullError = _.merge({}, fault, { requestBody: xml, responseBody: body })
            callback(fullError)
            return reject(fullError)
          }
          let out = _.get(doc, `Envelope.Body["${outputEl}"]`)
          callback(null, out)
          return resolve(out)
        })
      } catch (err) {
        callback(err)
        return reject(err)
      }
    })
  }
}

export default function buildServices (client) {
  let wsdl = client.wsdl
  let services = {}
  let nsList = []
  _.forEach(wsdl.namespaces, (ns, nsName) => {
    nsList.push(`xmlns:${ns.$requestNamespace}="${nsName}"`)
    _.forEach(ns.services, (svc, svcName) => {
      _.forEach(svc, (port, portName) => {
        let endpoint = getEndpointFromPort(client, port)
        let binding = wsdl.getBinding(port.binding)
        let soap = getSoapDefinition(binding)
        if (!soap) return true

        _.forEach(binding.operations, (op, opName) => {
          let opPath = `["${svcName}"]["${portName}"]["${opName}"]`
          _.set(services, opPath, soapOperation(client, endpoint, op, soap, nsList))
        })
      })
    })
  })
  return services
}