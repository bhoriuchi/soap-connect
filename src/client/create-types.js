import _ from 'lodash'
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
    if (namespace.prefix) prefix = namespace.prefix
    else nsCount++
    _.forEach(namespace.types, (type, typeIdx) => {
      _.set(types, `["${prefix}"]["${type}"]`, (data, context = {}) => {
        let { parentType, parentNS } = context
        let obj = {}
        let type = wsdl.getType([nsIdx, typeIdx])
        let base = type.base

        if (base) {
          if (wsdl.isBuiltInType(base)) {
            obj.value = data.value
          } else {
            let baseName = wsdl.getTypeName(base)
            let basePrefix = wsdl.getNSPrefix(base)
            obj = types[basePrefix][baseName](data)
          }
        }

        // set element values
        _.forEach(type.elements, (el) => {
          if (el.name && el.type) {
            let val = _.get(data, `["${el.name}"]`)
            let typeName = wsdl.getTypeName(el.type)
            let typePrefix = wsdl.getNSPrefix(el.type)
            let isSimple = wsdl.isSimpleType(el.type)
            if (val !== undefined) {
              if (wsdl.isMany(el)) {
                if (_.isArray(val)) {
                  obj[el.name] = _.map(val, (v) => {
                    return isSimple ? wsdl.convertValue(el.type, v) : types[typePrefix][typeName](v, {
                      parentType: [typePrefix, typeName].join(':')
                    })
                  })
                }
              } else {
                obj[el.name] = isSimple ? wsdl.convertValue(el.type, val) : types[typePrefix][typeName](val, {
                  parentType: [typePrefix, typeName].join(':')
                })
              }
            }
          }
        })

        // set attributes
        _.forEach(type.attributes, (attr) => {
          if (attr.name) {
            let val = _.get(data, `["${attr.name}"]`)
            if (val !== undefined) {
              if (attr.type && wsdl.isSimpleType(attr.type)) val = wsdl.convertValue(attr.type, val)
              obj[`@${attr.name}`] = val
            }
          }
        })
        if (!obj['@type'] && parentType) obj['@type'] = parentType
        return obj
      })
    })
  })
  return types
}