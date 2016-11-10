import _ from 'lodash'
import url from 'url'
import request from 'request'
import serialize from './serialize/index'
import { SOAP } from './const'

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

export function getSoapPrefix (wsdl, soap) {
  return _.get(_.without(_.get(wsdl.namespaces, `["${soap.wsdl}"].$alias`), ''), '[0]', 'soap')
}

export function soapOperation (client, endpoint, op, soap, nsList) {
  let wsdl = client.wsdl

  return (args = {}, options, callback) => {
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
        let body = serialize(client, inputEl, args)

        xml += wsdl.doctype
        xml += `<soapenv:Envelope xmlns:soapenv="${soap.envelope}" ${nsList.join(' ')}>`
        xml += `<soapenv:Header/>`
        xml += `<soapenv:Body>`
        xml += body
        xml += `</soapenv:Body>`
        xml += `</soapenv:Envelope>`

        // console.log(formatXML(xml))

        return resolve(formatXML(xml))
        /*
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
          callback(null, body)
          return resolve(body)
        })
        */

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
    _.forEach(ns.$alias, (alias) => {
      if (alias) nsList.push(`xmlns:${alias}="${nsName}"`)
    })
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