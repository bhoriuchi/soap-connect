import _ from 'lodash'
import { loadDocument } from '../load'
import { getTag, getType, getURI, setIf } from './common'

export function parse (client, meta, loaded, payload) {
  let {
    baseURI, el, tns, namespace, parent, serviceName, portName, nsMap, inTypes, inComplexType, inSimpleType, inSequence,
    elementName, elementType, elementPath, messageName, portTypeName, operationName, bindingName
  } = payload

  let $$ = client.$$

  _.forEach(el.childNodes, (child) => {
    let { ns, tag } = getTag(child)
    let [_ns, _tag] = [_.toLower(ns), _.toLower(tag)]

    let parseChildren = (data = {}) => {
      parse(client, meta, loaded, _.merge({}, payload, { el: child, parent: tag }, data))
    }

    switch (tag) {
      case 'xml':
        meta[$$('doctype')] = `<?xml ${child.nodeValue || child.data}?>`
        break

      case 'import':
        loadDocument({ client, meta, loaded,
          uri: getURI(child.getAttribute('location') || child.getAttribute('schemaLocation'), baseURI),
          payload: _.merge({}, payload, {
            namespace: child.getAttribute('namespace'),
            parent: tag
          })
        })
        break

      case 'include':
        loadDocument({ client, meta, loaded,
          uri: getURI(child.getAttribute('location') || child.getAttribute('schemaLocation'), baseURI),
          payload: _.merge({}, payload, {
            namespace: tns || namespace,
            parent: tag
          })
        })
        break

      case 'types':
        setIf(meta, 'types', {
          [$$('nsMap')]: nsMap
        })
        parseChildren({ intTypes: true })
        break

      case 'element':
        let elName = child.getAttribute('name')
        let elType = child.getAttribute('type')
        let elPath = elementPath ? `${elementPath}.props["${elName}"]` : `["${elName}"]`

        if (inComplexType || inSimpleType) {
          setIf(meta, `types["${tns}"]${elPath}["${$$('type')}"]`, elType ? getType(elType) : {})
        } else if (elType) {
          setIf(meta, `types["${tns}"]["${elName}"]`, {
            [$$('type')]: elType ? getType(elType) : {}
          })
        }
        parseChildren({ elementName: elName, elementPath: elPath, elementType: elType })
        break

      case 'extension':
        setIf(meta, `types["${tns}"]${elementPath}["${$$('extension')}"]`, child.getAttribute('base'))
        parseChildren()
        break

      case 'restriction':
        setIf(meta, `types["${tns}"]${elementPath}["${$$('restriction')}"]`, child.getAttribute('base'))
        parseChildren()
        break

      case 'enumeration':
        let enumValue = child.getAttribute('value')
        setIf(meta, `types["${tns}"]${elementPath}.enums["${enumValue}"]`, enumValue)
        parseChildren()
        break

      case 'complexType':
        let complexTypeName = child.getAttribute('name')
        if (complexTypeName) {
          setIf(meta, `types["${tns}"]["${complexTypeName}"]`, {})
          parseChildren({
            elementName: complexTypeName,
            elementPath: elementPath ? `${elementPath}.props["${complexTypeName}"]` : `["${complexTypeName}"]`,
            inComplexType: true
          })
        } else {
          parseChildren({ inComplexType: true })
        }
        break

      case 'simpleType':
        let simpleTypeName = child.getAttribute('name')
        if (simpleTypeName) {
          setIf(meta, `types["${tns}"]["${simpleTypeName}"]`, {})
          parseChildren({
            elementName: simpleTypeName,
            elementPath: elementPath ? `${elementPath}.props["${simpleTypeName}"]` : `["${simpleTypeName}"]`,
            inComplexType: true
          })
        } else {
          parseChildren({ inSimpleType: true })
        }
        break

      case 'complexContent':
        parseChildren()
        break

      case 'simpleContent':
        parseChildren()
        break

      case 'sequence':
        parseChildren({ inSequence: true })
        break

      case 'definitions':
        parseChildren({
          tns: child.getAttribute('targetNamespace') || tns || _.get(child, `_nsMap["${ns}"]`),
          nsMap: _.merge({}, nsMap, child._nsMap)
        })
        break

      case 'schema':
        parseChildren({
          tns: child.getAttribute('targetNamespace') || tns || _.get(child, `_nsMap["${ns}"]`),
          nsMap: _.merge({}, nsMap, child._nsMap),
          elementFormDefault: child.getAttribute('elementFormDefault')
        })
        break

      case 'service':
        let _serviceName = child.getAttribute('name')
        setIf(meta, `services["${_serviceName}"]`, {})
        parseChildren({ serviceName: _serviceName })
        break

      case 'port':
        let _portName = child.getAttribute('name')
        setIf(meta, `services["${serviceName}"].ports["${_portName}"]`, {
          [$$('binding')]: child.getAttribute('binding')
        })
        parseChildren({ portName: _portName })
        break

      case 'address':
        if (_ns === 'soap' && parent === 'port') {
          setIf(meta, `services["${serviceName}"].ports["${portName}"]["${$$('soap')}"]`, {
            location: child.getAttribute('location')
          })
        }
        break

      case 'message':
        let _messageName = child.getAttribute('name')
        let _messageType = child.getAttribute('type')
        setIf(meta, `messages["${tns}"]["${_messageName}"]`, {})
        parseChildren({ messageName: _messageName })
        break

      case 'part':
        let partName = child.getAttribute('name')
        let partType = getType(child.getAttribute('element') || child.getAttribute('type'))
        setIf(meta, `messages["${tns}"]["${messageName}"].parts["${partName}"].type`, partType)
        parseChildren()
        break

      case 'portType':
        let _portTypeName = child.getAttribute('name')
        parseChildren({ portTypeName: _portTypeName })
        break

      case 'operation':
        let _operationName = child.getAttribute('name')
        if (ns === 'soap') {
          setIf(meta, `operations["${tns}"]["${operationName}"]["${$$('soap')}"]`, {
            soapAction: child.getAttribute('soapAction'),
            style: child.getAttribute('style')
          })
        }
        if (bindingName) setIf(meta, `operations["${tns}"]["${_operationName}"]["${$$('binding')}"]`, bindingName)
        parseChildren({ operationName: _operationName })
        break

      case 'input':
        if (operationName) {
          setIf(meta, `operations["${tns}"]["${operationName}"].input.message`, child.getAttribute('message'))
        }
        parseChildren()
        break

      case 'output':
        if (operationName) {
          setIf(meta, `operations["${tns}"]["${operationName}"].output.message`, child.getAttribute('message'))
        }
        parseChildren()
        break

      case 'fault':
        let faultName = child.getAttribute('name')

        if (ns === 'soap') {
          if (operationName) {
            setIf(meta, `operations["${tns}"]["${operationName}"].faults["${faultName}"]["${$$('soap')}"].use`, child.getAttribute('use'))
          }
        } else {
          if (operationName) {
            setIf(meta, `operations["${tns}"]["${operationName}"].faults["${faultName}"].message`, child.getAttribute('message'))
          }
          parseChildren()
        }
        break

      case 'body':
        if (ns === 'soap') {
          if (parent === 'input' || parent === 'output') {
            setIf(meta, `operations["${tns}"]["${operationName}"].${parent}.use`, child.getAttribute('use'))
          }
        }
        break

      case 'binding':
        let _bindingName = child.getAttribute('name')
        let _bindingType = getType(child.getAttribute('type'))
        if (ns === 'soap') {
          if (bindingName) {
            setIf(meta, `bindings["${bindingName}"]["${$$('soap')}"]`, {
              style: child.getAttribute('style'),
              transport: child.getAttribute('transport')
            })
          }
        } else {
          setIf(meta, `bindings["${_bindingName}"]["${$$('type')}"]`, _bindingType)
          setIf(meta, `bindings["${_bindingName}"]["${$$('ns')}"]`, _bindingType.ns || tns)
          parseChildren({ bindingName: _bindingName })
        }
        break

      default:
        break
    }
  })
}

export default parse