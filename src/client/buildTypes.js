import _ from 'lodash'
import { getWsdlFn } from './common'
import { XSD } from './parse/const'
let xsdTypes = _.keys(XSD)

export default function buildTypes (client, meta) {
  _.forEach(meta.namespaces, (ns, nsName) => {
    _.forEach(ns.types, (type, typeName) => {
      _.set(client, `types["${nsName}"]["${typeName}"]`, (args) => {
        if (type.type && !type.props && !type.attrs) return getWsdlFn(client, type.type, nsName)(args)

        let attrs = []

        // get attributes
        _.forEach(type.attrs, (attr, attrName) => {
          let a = _.get(args, `@${attrName}`)
          if (a !== undefined) attrs.push(`${attrName}="${a}"`)
        })

        let xml = `<${nsName}:${typeName}${' '.concat(attrs.join(', '))}>`

        // get props
        _.forEach(type.props, (prop, propName) => {
          let p = _.get(args, propName)
          if (p !== undefined) {
            xml += `<${nsName}:${propName}>${p}</${nsName}:${propName}>`
          }
        })

        xml += `</${nsName}:${typeName}>`
        return xml
      })
    })
  })
}