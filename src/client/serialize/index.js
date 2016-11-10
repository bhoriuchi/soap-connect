import _ from 'lodash'

export function getAttrString (args, attrs) {
  let keys = _.intersection(_.keys(args.$attributes), _.keys(attrs))
  let mapped = _.map(keys, (key) => {
    let val = _.get(args, `$attributes["${key}"]`)
    return `${key}="${val}"`
  })
  return mapped.length ? ` ${mapped.join(', ')}` : ''
}

export function serializeProp (client, prefix, propName, prop, val) {
  let xml = ''
  let wsdl = client.wsdl
  let typeWsdl = wsdl.getTypeWsdl(prop.type)
  if (!_.isEmpty(typeWsdl)) return serialize(client, prop.type, val)
  let type = [prefix, propName].join(':')

  _.forEach(_.isArray(val) ? val : [val], (v) => {
    xml += `<${type}>${v}</${type}>`
  })
  return xml
}

export default function serialize (client, type, args) {
  console.log('serialize', type)
  let xml = ''
  let wsdl = client.wsdl
  let { prefix } = wsdl.splitType(type)
  let typeWsdl = wsdl.getTypeWsdl(type)

  if (!_.isEmpty(typeWsdl)) {
    xml += `<${type}${getAttrString(args, typeWsdl.attrs)}>`
    if (typeWsdl.extension) xml += serialize(client, typeWsdl.extension, args)

    if (typeWsdl.type) {
      xml += serialize(client, typeWsdl.type, args)
    } else {
      _.forEach(typeWsdl.props, (prop, propName) => {
        let val = _.get(args, `["${propName}"]`)
        if (val !== undefined) {
          xml += serializeProp(client, prefix, propName, prop, val)
        }
      })
    }

    xml += `</${type}>`
  } else {
    xml += args
  }

  return xml
}