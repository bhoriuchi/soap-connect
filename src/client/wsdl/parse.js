import _ from 'lodash'
import url from 'url'

export const SOAP = {
  'http://schemas.xmlsoap.org/wsdl/soap/': {
    version: '1.1',
    envelope: 'http://schemas.xmlsoap.org/soap/envelope/',
    httpTransport: 'http://schemas.xmlsoap.org/soap/http',
    encoding: 'http://schemas.xmlsoap.org/soap/encoding/'
  },
  'http://schemas.xmlsoap.org/wsdl/soap12/': {
    version: '1.2',
    envelope: 'http://www.w3.org/2003/05/soap-envelope',
    httpTransport: 'http://schemas.xmlsoap.org/soap/http',
    encoding: 'http://schemas.xmlsoap.org/soap/encoding/'
  }
}

export const XS = 'http://www.w3.org/2001/XMLSchema'
export const WSDL = 'http://schemas.xmlsoap.org/wsdl/'

export function getAttributes (el, omit = []) {
  let attrs = {}
  _.forEach(el.attributes, (a) => {
    if (_.isArray(omit)) {
      if (!_.includes(omit, a.name)) attrs[a.name] = a.value
    } else if (_.isFunction(omit)) {
      if (!omit(a)) attrs[a.name] = a.value
    } else {
      attrs[a.name] = a.value
    }
  })
  return attrs
}

export function setAttributes (base, path, el, omit) {
  _.forEach(getAttributes(el, omit), (val, name) => {
    _.set(base, `${path}["${name}"]`, val)
  })
}

export function getTag (el, nsMap) {
  let t = _.get(el, 'tagName') || _.get(el, 'nodeName')
  if (!t) throw new Error('No tag found')
  let [prefix, tag] = t.indexOf(':') !== -1 ? t.split(':') : ['', t]
  let ns = _.get(nsMap, `["${prefix}"]`)
  return { prefix, tag, ns }
}

export function getURI(loc, baseURI) {
  return url.parse(loc).host ? loc : url.resolve(baseURI, loc)
}

export function updateNSAlias (obj, nsMap) {
  _.forEach(nsMap, (ns, prefix) => {
    let pfxPath = `namespaces["${ns}"].$alias`
    let prefixes = _.get(obj, pfxPath)
    if (!_.isArray(prefixes)) _.set(obj, pfxPath, [prefix])
    else _.set(obj, pfxPath, _.union(prefixes, [prefix]))
  })
}

export default function (loaded, context) {
  let data = {}
  let { baseURI, el, targetNamespace, parent, nsMap, parentPath, inBinding } = context
  nsMap = _.merge({}, nsMap, el._nsMap)
  let { prefix, tag, ns } = getTag(el, nsMap)
  let isWsdlNS = _.get(nsMap, prefix) === WSDL
  let isXmlNS = _.get(nsMap, prefix) === XS
  let isSoapNS = _.includes(_.keys(SOAP), _.get(nsMap, prefix))
  let name = el && _.isFunction(el.getAttribute) ? el.getAttribute('name') : ''

  /*
   * WSDL Namespace
   */
  if (isWsdlNS) {
    switch (tag) {
      case 'definitions':
        targetNamespace = el.getAttribute('targetNamespace')
        updateNSAlias(this, nsMap)
        data = { targetNamespace }
        break

      case 'service':
        data = { parentPath: `namespaces["${targetNamespace}"].services["${name}"]` }
        break

      case 'port': // WSDL 1.1
        parentPath = `${parentPath}["${name}"]`
        _.set(this, `${parentPath}.binding`, el.getAttribute('binding'))
        data = { parentPath }
        break

      case 'endpoint': // WSDL 2.0
        parentPath = `${parentPath}["${name}"]`
        _.set(this, `${parentPath}.binding`, el.getAttribute('binding'))
        data = { parentPath }
        break

      case 'import':
        let importURI = getURI(el.getAttribute('location') || el.getAttribute('schemaLocation'), baseURI)
        this.loadDocument(importURI, loaded, {})
        break

      case 'include':
        let includeURI = getURI(el.getAttribute('schemaLocation') || el.getAttribute('location'), baseURI)
        this.loadDocument(includeURI, loaded, _.merge({}, context))
        break

      case 'message':
        data = { parentPath: `namespaces["${targetNamespace}"].messages["${name}"]` }
        break

      case 'part':
        parentPath = `${parentPath}.parts["${name}"]`
        setAttributes (this, parentPath, el, ['name'])
        data = { parentPath }
        break

      case 'portType': // WSDL 1.1
        data = { parentPath: `namespaces["${targetNamespace}"].interfaces["${name}"]` }
        break

      case 'interface': // WSDL 2.0
        data = { parentPath: `namespaces["${targetNamespace}"].interfaces["${name}"]` }
        break

      case 'operation':
        data = { parentPath: `${parentPath}["${name}"]` }
        break

      case 'input':
        parentPath = `${parentPath}.input`
        setAttributes(this, parentPath, el)
        data = { parentPath }
        break

      case 'output':
        parentPath = `${parentPath}.output`
        setAttributes(this, parentPath, el)
        data = { parentPath }
        break

      case 'fault':
        parentPath = `${parentPath}.faults["${name}"]`
        setAttributes(this, parentPath, el, ['name'])
        data = { parentPath }
        break

      case 'binding':
        parentPath = `namespaces["${targetNamespace}"].bindings["${name}"]`
        _.set(this, `${parentPath}.type`, el.getAttribute('type'))
        data = { parentPath }
        break

      default:
        break
    }
  }

  /*
   * XML Schema Namespace
   */
  else if (isXmlNS) {
    switch (tag) {
      case 'import':
        let importURI = getURI(el.getAttribute('location') || el.getAttribute('schemaLocation'), baseURI)
        this.loadDocument(importURI, loaded, {})
        break

      case 'include':
        let includeURI = getURI(el.getAttribute('schemaLocation') || el.getAttribute('location'), baseURI)
        this.loadDocument(includeURI, loaded, _.merge({}, context))
        break

      case 'schema':
        updateNSAlias(this, nsMap)
        data = {
          parentPath: `namespaces["${el.getAttribute('targetNamespace') || targetNamespace}"].types`,
          targetNamespace: el.getAttribute('targetNamespace') || targetNamespace,
          elementFormDefault: el.getAttribute('elementFormDefault')
        }
        break

      case 'attribute':
        _.set(this, `${parentPath}.attrs["${name}"].type`, el.getAttribute('type'))
        break

      case 'element':
        let elPath = (parent === 'schema') ? `${parentPath}["${name}"]` : `${parentPath}.props["${name}"]`
        setAttributes(this, elPath, el, ['name'])
        data = { parentPath: parent === 'schema' ? elPath : parentPath }
        break

      case 'complexType':
        data = { parentPath: (parent === 'schema' && name) ? `${parentPath}["${name}"]` : parentPath }
        break

      case 'simpleType':
        data = { parentPath: (parent === 'schema' && name) ? `${parentPath}["${name}"]` : parentPath }
        break

      case 'enumeration':
        let enumValue = el.getAttribute('value')
        _.set(this, `${parentPath}.enums["${enumValue}"]`, enumValue)
        break

      case 'extension':
        _.set(this, `${parentPath}.extension`, el.getAttribute('base'))
        break

      case 'restriction':
        _.set(this, `${parentPath}.extension`, el.getAttribute('base'))
        break

      default:
        break
    }
  }

  /*
   * SOAP Namespace
   */
  else if (isSoapNS) {
    switch (tag) {
      case 'address':
        _.set(this, `${parentPath}.$soap.address`, el.getAttribute('location'))
        break

      case 'binding':
        setAttributes(this, `${parentPath}.$soap`, el)
        break

      case 'operation':
        setAttributes(this, `${parentPath}.$soap`, el)
        break

      case 'body':
        setAttributes(this, `${parentPath}.$soap`, el)
        break

      case 'fault':
        setAttributes(this, `${parentPath}.$soap`, el, ['name'])
        break

      default:
        break
    }
  }

  /*
   * All other namespaces
   */
  else {
    switch (_.toLower(tag)) {
      case 'xml':
        let val = el.nodeValue || el.data
        this.doctype = val ? `<?xml ${val}?>` : this.doctype
        break

      default:
        break
    }
  }

  // process the children
  _.forEach(el.childNodes, (child) => {
    let ctx = _.merge({}, context, { nsMap }, data)
    ctx.el = child
    ctx.parent = tag
    this.parse(loaded, ctx)
  })
}