import _ from 'lodash'
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