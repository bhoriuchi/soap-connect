import _ from 'lodash'
import request from 'request'
import xmldom from 'xmldom'
import xmlbuilder from 'xmlbuilder'
import serialize from './serialize'
import deserialize from './deserialize'
import Promise from 'bluebird'
import processFault from './fault'
import { getEndpointFromPort, getFirstChildElement, firstNode } from './utils/index'
import { SOAP, XS_NS, XSI_NS, XS_PREFIX, XSI_PREFIX, SOAPENV_PREFIX, SOAPENC_PREFIX } from './const'

export default function createServices (wsdl) {
  let services = {}
  _.forEach(wsdl.metadata.namespaces, (namespace, nsIdx) => {
    _.forEach(namespace.ports, (port, portIdx) => {
      let soapVars = _.find(SOAP, { version: port.soapVersion })
      _.forEach(port.operations, (opName, opIdx) => {
        let opPath = `["${port.service}"]["${port.name}"]["${opName}"]`
        _.set(services, opPath, (data, options) => {
          return new Promise((resolve, reject) => {
            options = _.isObject(options) ? options : {}
            let endpoint = getEndpointFromPort(this, port)
            let [ input, output ] = wsdl.getOp([nsIdx, portIdx, opIdx])
            let soapAction = input.action
            let opName = input.name
            let inputTypePrefix = wsdl.getNSPrefix(input.type)

            let { obj, nsUsed } = serialize(wsdl, input.type, data)

            let envelope = {
              [`@xmlns:${SOAPENV_PREFIX}`]: soapVars.envelope,
              [`@xmlns:${SOAPENC_PREFIX}`]: soapVars.encoding,
              [`@xmlns:${XSI_PREFIX}`]: XSI_NS,
              [`@xmlns:${XS_PREFIX}`]: XS_NS
            }
            let header = {}
            let body = {}

            _.forEach(_.union(nsUsed, [inputTypePrefix]), (prefix) => {
              body[`@xmlns:${prefix}`] = wsdl.getNSURIByPrefix(prefix)
            })

            body[`${inputTypePrefix}:${opName}`] = obj
            envelope[`${SOAPENV_PREFIX}:Header`] = header
            envelope[`${SOAPENV_PREFIX}:Body`] = body

            let inputXML = xmlbuilder.create({ [`${SOAPENV_PREFIX}:Envelope`]: envelope }).end({
              pretty: true,
              encoding: this.options.encoding || 'UTF-8'
            })

            let headers = {
              'Content-Type': soapVars.contentType,
              'Content-Length': inputXML.length,
              'SOAPAction': soapAction,
              'User-Agent': this.options.userAgent
            }
            this._security.addHttpHeaders(headers)

            let requestObj = { headers, url: endpoint, body: inputXML }
            this.emit('soap.request', requestObj)
            request.post(requestObj, (error, res, body) => {
              if (error) {
                let errResponse = { error, res, body }
                this.emit('soap.error', errResponse)
                return reject(errResponse)
              }
              this.lastResponse = res
              let doc = new xmldom.DOMParser().parseFromString(body)
              let soapEnvelope = firstNode(doc.getElementsByTagNameNS(soapVars.envelope, 'Envelope'))
              let soapBody = firstNode(doc.getElementsByTagNameNS(soapVars.envelope, 'Body'))
              let soapFault = firstNode(soapBody.getElementsByTagNameNS(soapVars.envelope, 'Fault'))
              let xsiPrefix = _.findKey(soapEnvelope._nsMap, (nsuri) => nsuri === XSI_NS)
              let context = { xsiPrefix }

              if (soapFault) {
                let fault = processFault(wsdl, soapFault, context)
                this.emit('soap.fault', { fault, res, body })
                return reject(fault)
              }

              let result = deserialize(wsdl, output.type, getFirstChildElement(soapBody), context)
              this.emit('soap.response', { res, body })
              return resolve(result)
            })
          })
        })
      })
    })
  })
  return services
}