import _ from 'lodash'
import xsd from './wsdl/namespaces/xsd1.0'

export function getWsdlFn (wsdl, types, type, nsName) {
  let { ns, name } = wsdl.getNsInfoByType(type)
  let typeFn = _.get(types, `["${ns || nsName}"]["${name}"]`)
  return _.isFunction(typeFn) ? typeFn : () => {}
}

export default function buildTypes (client) {
  let wsdl = client.wsdl
  let nsCount = 1

  let types = {
    'http://www.w3.org/2001/XMLSchema': _.mapValues(xsd, () => {
      return (obj) => {
        return { $value: obj.$value || obj }
      }
    })
  }

  _.forEach(wsdl.namespaces, (ns, nsName) => {
    let reqNs = ns.$requestNamespace = `ns${nsCount}`
    nsCount++

    _.forEach(ns.types, (type, typeName) => {
      _.set(types, `["${nsName}"]["${typeName}"]`, (obj) => {
        if (type.type) {
          return { [`${reqNs}:${typeName}`]: getWsdlFn(wsdl, types, type.type, nsName)(obj) }
        }

        let [t, extension] = [{}, _.get(type, 'extension')]

        _.forEach(type.attrs, (attr, attrName) => {
          let a = _.get(obj, `$attributes["${attrName}"]`)
          if (a !== undefined) _.set(t, `$attributes["${attrName}"]`, a)
        })

        if (extension) _.merge(t, getWsdlFn(wsdl, types, type.extension, nsName)(obj))

        _.forEach(type.props, (prop, propName) => {
          let p = _.get(obj, propName)
          if (p) {
            // if (_.includes(xsdTypes, prop.type)) t[propName] = p
            t[`${reqNs}:${propName}`] = getWsdlFn(wsdl, types, prop.type, nsName)(obj[propName])
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

/*
import { getWsdlFn } from './common'
import { XSD, WSDL_SCHEMAS } from './parse/const'
let xsdTypes = _.keys(XSD)

export default function buildTypes (client, meta) {
  _.forEach(meta.namespaces, (ns, nsName) => {
    // set built in schemas
    _.forEach(WSDL_SCHEMAS[ns.name], (fn, name) => _.set(client, `types["${nsName}"]["${name}"]`, fn))

    // set ns types
    _.forEach(ns.types, (type, typeName) => {
      _.set(client, `types["${nsName}"]["${typeName}"]`, (args) => {
        if (type.type && !type.props && !type.attrs) return { [typeName]: getWsdlFn(client, type.type, nsName)(args) }

        let [t, extension] = [{}, _.get(type, 'extension')]

        _.forEach(type.attrs, (attr, attrName) => {
          let a = _.get(args, `@${attrName}`)
          if (a !== undefined) t[`@${attrName}`] = a
        })

        if (extension) _.merge(t, getWsdlFn(client, type.extension, nsName)(args))

        _.forEach(type.props, (prop, propName) => {
          let p = _.get(args, propName)
          if (p) {
            if (_.includes(xsdTypes, prop.type)) t[propName] = p
            else t[propName] = getWsdlFn(client, prop.type, nsName)(args[propName])
          }
        })

        return t
      })
    })
  })
}
*/