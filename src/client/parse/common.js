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

export default {
  getTag,
  getType,
  getURI,
  setIf,
  getXmlnsFromNS
}