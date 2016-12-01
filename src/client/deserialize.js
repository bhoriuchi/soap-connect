import _ from 'lodash'

export default function deserialize (wsdl, type, node, context = {}) {
  if (!node.textContent) return undefined
  let { xsiPrefix } = context
  let xsiType = node.getAttribute(`${xsiPrefix}:type`)
  type = xsiType ? wsdl.getTypeByQName(xsiType, node.namespaceURI) : type

  let typeDef = wsdl.getType(type)
  let typeIsMany = wsdl.isMany(typeDef)
  let obj = typeIsMany ? [] : {}

  if (typeDef.base && wsdl.isBuiltInType(wsdl.getTypeRoot(typeDef.base))) {
    obj = { value: wsdl.convertValue(typeDef.base, node.textContent) }
  }

  if (wsdl.isSimpleType(type)) return wsdl.convertValue(type, node.textContent)

  _.forEach(typeDef.elements, (el) => {
    let isMany = wsdl.isMany(el) || typeIsMany
    if (isMany && !typeIsMany && el.name) obj[el.name] = []

    _.forEach(node.childNodes, (node) => {
      if (node.localName === el.name) {
        let o = deserialize(wsdl, el.type, node, context)
        if (o !== undefined) {
          if (isMany) {
            if (typeIsMany) obj.push(o)
            else obj[el.name].push(o)
          } else {
            obj[el.name] = o
          }
        }
      }
    })
  })
  _.forEach(typeDef.attributes, (attr) => {
    let { name, type } = attr
    if (name && type) {
      let val = node.getAttribute(name)
      if (val) obj[name] = wsdl.convertValue(type, val)
    }
  })
  return obj
}