import _ from 'lodash'
import url from 'url'
import { XS, WSDL } from '../const'

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
  let { baseURI, el, targetNamespace, parent, nsMap, parentPath } = context
  nsMap = _.merge({}, nsMap, el._nsMap)
  let { prefix, tag, ns } = this.getTag(el, nsMap)
  let isWsdlNS = _.get(nsMap, prefix) === WSDL
  let isXmlNS = _.get(nsMap, prefix) === XS
  let name = el && _.isFunction(el.getAttribute) ? el.getAttribute('name') : ''

  /*
   * XML Doctype
   */
  if (_.toLower(tag) === 'xml') {
    let val = el.nodeValue || el.data
    this.doctype = val ? `<?xml ${val}?>` : this.doctype
  }

  /*
   * WSDL Namespace
   */
  else if (isWsdlNS) {
    switch (tag) {
      case 'definitions':
        targetNamespace = el.getAttribute('targetNamespace')
        updateNSAlias(this, nsMap)
        data = { targetNamespace }
        break

      case 'types':
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
        let importLoc = el.getAttribute('location') || el.getAttribute('schemaLocation')
        if (importLoc) this.loadDocument(getURI(importLoc, baseURI), loaded, {})
        break

      case 'include':
        let includeLoc = el.getAttribute('schemaLocation') || el.getAttribute('location')
        if (includeLoc) this.loadDocument(getURI(includeLoc, baseURI), loaded, _.merge({}, context))
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
        data = { parentPath: `${parentPath}.operations["${name}"]` }
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

      case '#text':
        break

      default:
        console.log('TAG!', tag, name)
        break
    }
  }

  /*
   * XML Schema Namespace
   */
  else if (isXmlNS) {
    switch (tag) {
      case 'import':
        let importLoc = el.getAttribute('location') || el.getAttribute('schemaLocation')
        if (importLoc) this.loadDocument(getURI(importLoc, baseURI), loaded, {})
        break

      case 'include':
        let includeLoc = el.getAttribute('schemaLocation') || el.getAttribute('location')
        if (includeLoc) this.loadDocument(getURI(includeLoc, baseURI), loaded, _.merge({}, context))
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
        setAttributes(this, elPath, el, ['name', 'minOccurs', 'maxOccurs'])
        let [minOccurs, maxOccurs] = [el.getAttribute('minOccurs'), el.getAttribute('maxOccurs')]
        if (minOccurs || maxOccurs) {
          minOccurs = minOccurs ? Number(minOccurs) : null
          maxOccurs = maxOccurs === 'unbounded' ? 1 : Number(maxOccurs)
          let isMany = minOccurs >= 0 && maxOccurs !== 0
          if (isMany) _.set(this, `${elPath}.isMany`, true)
        }
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

      case 'sequence':
        if (!_.has(this, parentPath)) _.set(this, parentPath, {})
        break

      default:
        break
    }
  }

  /*
   * add all other NS as properties
   */
  else {
    parentPath = `${parentPath}["$${tag}"]`
    setAttributes(this, parentPath, el, ['name'])
    if (tag === 'binding') _.set(this, `${parentPath}.$ns`, ns)
    data = { parentPath }
  }

  // process the children
  _.forEach(el.childNodes, (child) => {
    let ctx = _.merge({}, context, { nsMap }, data)
    ctx.el = child
    ctx.parent = tag
    this.parse(loaded, ctx)
  })
}