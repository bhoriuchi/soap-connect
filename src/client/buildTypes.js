import _ from 'lodash'
import xsd from './wsdl/namespaces/xsd1.0'

export function getWsdlFn (wsdl, types, type, nsName) {
  let { ns, name } = wsdl.getNsInfoByType(type)
  let typeFn = _.get(types, `["${ns || nsName}"]["${name}"]`)
  return _.isFunction(typeFn) ? typeFn : () => {
    console.error('!!!!failed to find', type)
  }
}

export function getInheritance (ns, typeName) {
  let inheritance = []
  _.forEach(ns.types, (type, name) => {
    let ext = _.get(type, 'extension', '')
    if (ext === typeName) inheritance.push(name)
  })
  return inheritance
}

export function bestTypeMatch (ns, type, inherit, data) {
  let [ pfx, typeName ] = type.split(':')
  let typeKeys = _.keys(_.get(ns, `types["${typeName}"].props`))
  let dataKeys = !_.isArray(data) ? _.isObject(data) ? _.keys(data) : [] : _.reduce(data, (l, r) => {
    return _.isObject(r) && !_.isArray(r) ? _.union(l, _.keys(r)) : _.union(l, [])
  }, [])
  let interCount = _.intersection(typeKeys, dataKeys).length

  _.forEach(inherit, (i) => {
    let cTypeKeys = _.keys(_.get(ns, `types["${i}"].props`))
    let cInter = _.intersection(cTypeKeys, dataKeys).length
    if (cInter > interCount) {
      interCount = cInter
      typeName = i
    }
  })
  return `${pfx}:${typeName}`
}

export default function buildTypes (client) {
  let wsdl = client.wsdl
  let nsCount = 1

  let types = {
    'http://www.w3.org/2001/XMLSchema': _.mapValues(xsd, () => {
      return (obj) => {
        console.log(obj)
        return {
          $attributes: obj.$attributes,
          $value: obj.$value || obj
        }
      }
    })
  }

  _.forEach(wsdl.namespaces, (ns, nsName) => {
    let reqNs = ns.$requestNamespace = `ns${nsCount}`
    nsCount++

    _.forEach(ns.types, (type, typeName) => {
      _.set(types, `["${nsName}"]["${typeName}"]`, (obj) => {
        if (_.isEmpty(type)) return {}

        if (type.type) return { [`${reqNs}:${typeName}`]: getWsdlFn(wsdl, types, type.type, nsName)(obj) }
        let [t, extension] = [{}, _.get(type, 'extension')]
        if (extension && !wsdl.isSimple(extension)) _.merge(t, getWsdlFn(wsdl, types, extension, nsName)(obj))
        _.set(t, '$attributes.type', typeName)

        _.forEach(type.attrs, (attr, attrName) => {
          let a = _.get(obj, `$attributes["${attrName}"]`)
          if (a !== undefined) _.set(t, `$attributes["${attrName}"]`, a)
        })

        let xsiType = _.get(obj, '$attributes.xsi:type')
        if (xsiType) _.set(t, '$attributes.type', xsiType)
        if (obj.$value !== undefined) t.$value = obj.$value

        _.forEach(type.props, (prop, propName) => {
          let [ pfx ] = prop.type.split(':')
          let inherit = _.includes(ns.$alias, pfx) ? getInheritance(ns, prop.type) : []
          let isSimple = wsdl.isSimple(prop.type)
          let p = _.get(obj, propName)
          let propType = bestTypeMatch(ns, prop.type, inherit, p)

          if (p) {
            if (prop.isMany) {
              t[`${reqNs}:${propName}`] = _.map(p, (v) => {
                return isSimple ? v : getWsdlFn(wsdl, types, propType, nsName)(v)
              })
            } else {
              t[`${reqNs}:${propName}`] = isSimple ? p : getWsdlFn(wsdl, types, propType, nsName)(p)
            }
          }
        })

        return t
      })
    })
  })

  _.forEach(wsdl.namespaces, (ns, nsName) => {
    let typeObj = _.get(types, `["${nsName}"]`)
    _.forEach(ns.$alias, (alias) => {
      if (alias && typeObj) _.set(client, `types["${alias}"]`, typeObj)
    })
  })
}