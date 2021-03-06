import _ from 'lodash'
import { XS_NS, XS_PREFIX } from './const'
import NAMESPACES from './wsdl/namespaces/index'

function bestTypeMatch (wsdl, type, data) {

}

export default function createTypes (wsdl) {
  let [ nsCount, types ] = [ 1, {} ]

  // add convert functions to builtins
  let nsIdx = 0
  _.forEach(NAMESPACES, (ns) => {
    let typeIdx = 0
    _.forEach(ns, (type) => {
      wsdl.metadata.types[nsIdx][typeIdx] = _.cloneDeep(type)
      typeIdx++
    })
    nsIdx++
  })

  // add extendedBy to keep track of inheritance
  _.forEach(wsdl.metadata.types, (namespace, nsIdx) => {
    _.forEach(namespace, (type, typeIdx) => {
      if (type.base) {
        let t = wsdl.getType(type.base)
        if (t) {
          t.extendedBy = t.extendedBy || []
          t.extendedBy.push([nsIdx, typeIdx])
        }
      }
    })
  })

  _.forEach(wsdl.metadata.namespaces, (namespace, nsIdx) => {
    let prefix = `ns${nsCount}`
    if (namespace.prefix) {
      prefix = namespace.prefix
    } else if (namespace.name === XS_NS) {
      wsdl.metadata.namespaces[nsIdx].prefix = XS_PREFIX
      prefix = XS_PREFIX
    } else {
      wsdl.metadata.namespaces[nsIdx].prefix = prefix
      nsCount++
    }
    _.forEach(namespace.types, (typeName, typeIdx) => {
      _.set(types, `["${prefix}"]["${typeName}"]`, (data) => {

      })
    })
  })
  return types
}