import _ from 'lodash'
import { firstNode, getNodeData } from './utils/index'

export default function deserialize (wsdl, type, node) {
  let obj = {}

  if (type.base) {
    obj = !wsdl.isBuiltInType(type.base) ? deserialize(wsdl, wsdl.getType(type.base), node) : {
      value: wsdl.convertValue(type.base, getNodeData(node))
    }
  }

  _.forEach(type.elements, (el) => {
    let { type, name } = el
    let elems = node.getElementsByTagName(name)
    let firstElem = firstNode(elems)
    let isSimple = wsdl.isSimpleType(el.type)

    if (firstElem) {
      let elemType = wsdl.getType(type)

      if (wsdl.isMany(el.type)) {
        obj[name] = _.map(elems, (node) => {
          return isSimple ? wsdl.convertValue(el.type, getNodeData(node)) : deserialize(wsdl, elemType, node)
        })
      } else {
        obj[name] = isSimple ? wsdl.convertValue(el.type, getNodeData(firstElem)) : deserialize(wsdl, elemType, firstElem)
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