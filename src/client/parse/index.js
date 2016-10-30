import _ from 'lodash'
import { loadDocument } from '../load'
import { SOAP_DEFINITION } from './const'
import { getTag, getType, getURI, setIf, getXmlnsFromNS } from './common'

export function parse (client, meta, loaded, payload) {
  let {
    baseURI, el, targetNamespace, tns, namespace, parent, serviceName, portName, nsMap, inTypes, inComplexType, inSimpleType, inSequence,
    elementName, elementType, elementPath, portTypeName, operationName, bindingName, parentPath
  } = payload

  let $$ = (v) => { return `$${v}`}
  _.forEach(el.childNodes, (child) => {
    let { ns, tag } = getTag(child)
    let [_ns, _tag] = [_.toLower(ns), _.toLower(tag)]

    let parseChildren = (data = {}) => {
      parse(client, meta, loaded, _.merge({}, payload, { el: child, parent: tag }, data))
    }

    // get the current xmlns
    let xmlns = getXmlnsFromNS(nsMap, targetNamespace) || targetNamespace

    switch (tag) {
      case 'xml':
        meta.$doctype = `<?xml ${child.nodeValue || child.data}?>`
        break

      case 'definitions':
        _.forEach(child._nsMap, (name, ns) => {
          if (ns === '') {
            meta.namespaces.$wsdl = name
          } else {
            setIf(meta.namespaces, `["${ns}"]`, { name })
            if (ns === 'soap') meta.$soap = SOAP_DEFINITION[name]
          }
        })
        parseChildren({ targetNamespace: child.getAttribute('targetNamespace'), nsMap: child._nsMap })
        break

      case 'service':
        parentPath = `namespaces["${xmlns}"].services["${child.getAttribute('name')}"]`
        parseChildren({ parentPath })
        break

      case 'port': // WSDL 1.1
        parentPath = `${parentPath}["${child.getAttribute('name')}"]`
        setIf(meta, parentPath, { $binding: child.getAttribute('binding') })
        parseChildren({ parentPath })
        break

      case 'endpoint': // WSDL 2.0
        parentPath = `${parentPath}["${child.getAttribute('name')}"]`
        setIf(meta, parentPath, { $binding: child.getAttribute('binding') })
        parseChildren({ parentPath })
        break

      case 'import':
        loadDocument({ client, meta, loaded,
          uri: getURI(child.getAttribute('location') || child.getAttribute('schemaLocation'), baseURI),
          payload: { targetNamespace }
        })
        break

      case 'include':
        loadDocument({ client, meta, loaded,
          uri: getURI(child.getAttribute('location') || child.getAttribute('schemaLocation'), baseURI),
          payload: { targetNamespace }
        })
        break

      case 'types':
        parseChildren({ intTypes: true })
        break

      case 'schema':
        parseChildren({
          targetNamespace: child.getAttribute('targetNamespace') || targetNamespace,
          elementFormDefault: child.getAttribute('elementFormDefault'),
          nsMap: _.merge(nsMap, child._nsMap)
        })
        break

      case 'element':
        let elPath = parentPath
        let [elName, elType] = [child.getAttribute('name'), child.getAttribute('type')]
        let [minOccurs, maxOccurs] = [child.getAttribute('minOccurs'), child.getAttribute('maxOccurs')]

        if (parent === 'schema') elPath = `namespaces["${xmlns}"].types["${elName}"]`
        else elPath = `${parentPath}.props["${elName}"]`

        _.set(meta, `${elPath}.type`, elType || undefined)
        _.set(meta, `${elPath}.minOccurs`, minOccurs || undefined)
        _.set(meta, `${elPath}.maxOccurs`, maxOccurs || undefined)
        parseChildren({ parentPath: parent === 'schema' ? elPath : parentPath })
        break

      case 'complexType':
        let cTypeName = child.getAttribute('name')
        parseChildren({ parentPath: cTypeName ? `namespaces["${xmlns}"].types["${cTypeName}"]` : parentPath })
        break

      case 'simpleType':
        let sTypeName = child.getAttribute('name')
        parseChildren({ parentPath: sTypeName ? `namespaces["${xmlns}"].types["${sTypeName}"]` : parentPath })
        break

      case 'enumeration':
        let enumValue = child.getAttribute('value')
        setIf(meta, `${parentPath}.enums["${enumValue}"]`, enumValue)
        parseChildren()
        break

      case 'extension':
        setIf(meta, `${parentPath}.extension`, child.getAttribute('base'))
        parseChildren()
        break

      case 'restriction':
        setIf(meta, `${parentPath}.restriction`, child.getAttribute('base'))
        parseChildren()
        break

      case 'message':
        parseChildren({ parentPath: `namespaces["${xmlns}"].messages["${child.getAttribute('name')}"]` })
        break

      case 'part':
        let partName = child.getAttribute('name')
        let partType = child.getAttribute('element') || child.getAttribute('type')
        setIf(meta, `${parentPath}["${partName}"]`, partType)
        parseChildren()
        break

      case 'portType': // WSDL 1.1
        let ptName = child.getAttribute('name')
        parseChildren({ parentPath: `namespaces["${xmlns}"].portTypes["${ptName}"]` })
        break

      case 'interface': // WSDL 2.0
        let ifName = child.getAttribute('name')
        parseChildren({ parentPath: `namespaces["${xmlns}"].portTypes["${ifName}"]` })
        break

      case 'operation':
        let opPath = `${parentPath}["${child.getAttribute('name')}"]`
        if (parent === 'portType' || parent === 'interface') {
          parseChildren({ parentPath: opPath })
        }

        /*
        if (ns === 'soap') {
          setIf(meta, `operations["${tns}"]["${operationName}"]["${$$('soap')}"]`, {
            soapAction: child.getAttribute('soapAction'),
            style: child.getAttribute('style')
          })
        }
        if (bindingName) setIf(meta, `operations["${tns}"]["${_operationName}"]["${$$('binding')}"]`, bindingName)
        parseChildren({ operationName: _operationName })
        */
        break

      case 'input':
        _.set(meta, `${parentPath}.input.name`, child.getAttribute('name') || undefined)
        _.set(meta, `${parentPath}.input.message`, child.getAttribute('message') || undefined)
        break

      case 'output':
        _.set(meta, `${parentPath}.output.name`, child.getAttribute('name') || undefined)
        _.set(meta, `${parentPath}.output.message`, child.getAttribute('message') || undefined)
        break

      case 'fault':
        let faultName = child.getAttribute('name')
        _.set(meta, `${parentPath}.faults["${faultName}"]`, child.getAttribute('message'))
        /*
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
        */
        break

      case 'body1':
        if (ns === 'soap') {
          if (parent === 'input' || parent === 'output') {
            setIf(meta, `operations["${tns}"]["${operationName}"].${parent}.use`, child.getAttribute('use'))
          }
        }
        break

      case 'binding1':
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

      case 'address1':
        if (_ns === 'soap' && parent === 'port') {
          setIf(meta, `services["${serviceName}"].ports["${portName}"]["${$$('soap')}"]`, {
            location: child.getAttribute('location')
          })
        }
        break

      default:
        parseChildren({})
        break
    }
  })
}

export default parse