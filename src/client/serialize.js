import _ from 'lodash'

export default function serialize (wsdl, typeCoord, data, context = {}) {
  try {
    let { parentType, nsUsed } = context
    let obj = {}
    let prefix = wsdl.getNSPrefix(typeCoord)
    let type = wsdl.getType(typeCoord)
    let base = type.base
    nsUsed = nsUsed ? _.union(nsUsed, [prefix]) : [prefix]

    if (base) {
      obj = !wsdl.isBuiltInType(base) ? serialize(wsdl, base, data, context).obj : { '#text': data.value }
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
              obj[`${prefix}:${el.name}`] = _.map(val, (v) => {
                return isSimple ? wsdl.convertValue(el.type, v) : serialize(wsdl, el.type, v, {
                  parentType: [typePrefix, typeName].join(':'),
                  nsUsed
                }).obj
              })
            }
          } else {
            obj[`${prefix}:${el.name}`] = isSimple ? wsdl.convertValue(el.type, val) : serialize(wsdl, el.type, val, {
              parentType: [typePrefix, typeName].join(':'),
              nsUsed
            }).obj
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
    return { obj, nsUsed }
  } catch (err) { console.error('BLSADHDHSD', err) }
}