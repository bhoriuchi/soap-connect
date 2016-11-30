import _ from 'lodash'
import { firstNode, getNodeData } from './utils/index'
import { XSI_NS } from './const'

export default function deserialize (wsdl, type, node, context = {}) {
  let obj = {}
  let { xsiPrefix } = context

  if (type.base) {
    obj = !wsdl.isBuiltInType(type.base) ? deserialize(wsdl, wsdl.getType(type.base), node, context) : {
      value: wsdl.convertValue(type.base, getNodeData(node))
    }
  }

  _.forEach(type.elements, (el) => {
    let { type, name } = el
    let elems = node.getElementsByTagName(name)
    let firstElem = firstNode(elems)

    if (firstElem) {
      let xsiType = firstElem.getAttribute(`${xsiPrefix}:type`)
      type = xsiType ? wsdl.getTypeByLocalNS(firstElem.namespaceURI, xsiType) : type
      let elemType = wsdl.getType(type)
      let isSimple = wsdl.isSimpleType(type)

      if (name === 'val') {
        console.log(wsdl.getTypeName(type), isSimple, elemType)
      }

      if (wsdl.isMany(el)) {
        obj[name] = _.map(elems, (node) => {
          return isSimple ? wsdl.convertValue(type, getNodeData(node)) :
            deserialize(wsdl, elemType, node, context)
        })
      } else {
        elemType = xsiType ? wsdl.getTypeByLocalNS(firstElem.namespaceURI, xsiType) : elemType
        obj[name] = isSimple ? wsdl.convertValue(type, getNodeData(firstElem)) :
          deserialize(wsdl, elemType, firstElem, context)
      }
    }
  })

  _.forEach(type.attributes, (attr) => {
    let { name, type } = attr
    let val = node.getAttribute(name)
    if (val) obj[name] = wsdl.convertValue(type, val)
  })

  return obj
}