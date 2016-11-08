import _ from 'lodash'
import url from 'url'

export function getTag (child) {
  let t = child.tagName || child.nodeName
  let [ns, tag] = t.indexOf(':') !== -1 ? t.split(':') : ['', t]
  return { ns, tag }
}

export function getType (t) {
  let [prefix, name] = t.indexOf(':') !== -1 ? t.split(':') : ['', t]
  return { prefix, name }
}

export function getURI(loc, baseURI) {
  return url.parse(loc).host ? loc : url.resolve(baseURI, loc)
}

export function setIf (obj, path, val) {
  if (!_.keys(val).length) {
    if (!_.has(obj, path)) _.set(obj, path, val)
  } else {
    _.set(obj, path, val)
  }
  return _.get(obj, path)
}

export function getXmlnsFromNS (nsMap, ns) {
  for (const key in nsMap) {
    if (nsMap[key] === ns) return key
  }
}

export function mergeOperations (meta) {
  _.forEach(meta.namespaces, (namespace) => {
    _.forEach(namespace.bindings, (binding) => {
      let type = getType(binding.type)
      let operations = _.get(meta.namespaces, `["${type.prefix}"].portTypes["${type.name}"].operations`, {})
      _.merge(binding.operations, operations)
    })
  })
  _.forEach(meta.namespaces, (namespace) => {
    delete namespace.portTypes
  })
}

export function getNsByName (meta, name) {
  return _.find(_.map(meta.namespaces, (ns) => ns), { name })
}

export function getPrefixByNS (meta, ns) {
  let prefix = null
  _.forEach(meta.namespaces, (n, p) => {
    if (n.name === ns && n.types) {
      prefix = p
      return false
    }
  })
  return prefix
}

export function getWsdlType (meta, type, defaultPrefix) {
  let { prefix, name } = getType(type)
  return _.get(meta, `namespaces["${prefix || defaultPrefix}"].types["${name}"]`)
}

export function getWsdlFn (client, type, defaultPrefix) {
  let { prefix, name } = getType(type)
  return _.get(client, `types["${prefix || defaultPrefix}"]["${name}"]`, () => {
    throw new Error(`unable to find ${type}`)
  })
}

export default {
  getTag,
  getType,
  getURI,
  setIf,
  getXmlnsFromNS,
  mergeOperations,
  getNsByName,
  getWsdlType,
  getWsdlFn,
  getPrefixByNS
}