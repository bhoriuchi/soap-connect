import _ from 'lodash'
import { loadDocument } from './load'
import { SOAP_DEFINITION } from './const'
import { getTag, getURI, setIf, getXmlnsFromNS } from '../common'

export function parse (client, meta, loaded, payload) {
  let { baseURI, el, targetNamespace, parent, nsMap, parentPath, inBinding } = payload

  _.forEach(el.childNodes, (child) => {
    let { ns, tag } = getTag(child)
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
        setIf(meta, `${parentPath}.binding`, child.getAttribute('binding'))
        parseChildren({ parentPath })
        break

      case 'endpoint': // WSDL 2.0
        parentPath = `${parentPath}["${child.getAttribute('name')}"]`
        setIf(meta, `${parentPath}.binding`, child.getAttribute('binding'))
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

      case 'attribute':
        console.log('here')
        _.set(meta, `${parentPath}.attrs["${child.getAttribute('name')}"].type`, child.getAttribute('type'))
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
        if (parent === 'portType' || parent === 'interface' || parent === 'binding') {
          parseChildren({ parentPath: `${parentPath}.operations["${child.getAttribute('name')}"]` })
        } else if (ns === 'soap') {
          _.set(meta, `${parentPath}.action`, child.getAttribute('soapAction'))
          _.set(meta, `${parentPath}.style`, child.getAttribute('style'))
          parseChildren()
        }
        break

      case 'input':
        if (!inBinding) {
          _.set(meta, `${parentPath}.input.name`, child.getAttribute('name') || undefined)
          _.set(meta, `${parentPath}.input.message`, child.getAttribute('message') || undefined)
        } else {
          setIf(meta, `${parentPath}.input`, {})
          parseChildren({ parentPath: `${parentPath}.input` })
        }
        break

      case 'output':
        if (!inBinding) {
          _.set(meta, `${parentPath}.output.name`, child.getAttribute('name') || undefined)
          _.set(meta, `${parentPath}.output.message`, child.getAttribute('message') || undefined)
        } else {
          setIf(meta, `${parentPath}.output`, {})
          parseChildren({ parentPath: `${parentPath}.output` })
        }
        break

      case 'fault':
        if (ns === 'soap') {
          _.set(meta, `${parentPath}.use`, child.getAttribute('use'))
        } else {
          _.set(meta, `${parentPath}.faults["${child.getAttribute('name')}"].message`, child.getAttribute('message') || undefined)
          parseChildren({ parentPath: `${parentPath}.faults["${child.getAttribute('name')}"]` })
        }
        break

      case 'binding':
        if (parent === 'definitions') {
          parentPath = `namespaces["${xmlns}"].bindings["${child.getAttribute('name')}"]`
          _.set(meta, `${parentPath}.type`, child.getAttribute('type'))
        } else if (ns === 'soap') {
          _.set(meta, `${parentPath}.style`, child.getAttribute('style') || undefined)
          _.set(meta, `${parentPath}.transport`, child.getAttribute('transport') || undefined)
        }
        parseChildren({ parentPath, inBinding: true })
        break

      case 'body':
        setIf(meta, `${parentPath}.use`, child.getAttribute('use'))
        break

      case 'address':
        if (parent === 'port') _.set(meta, `${parentPath}.address`, child.getAttribute('location'))
        break

      default:
        parseChildren()
        break
    }
  })
}

export default parse