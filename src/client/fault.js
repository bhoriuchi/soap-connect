import deserialize from './deserialize'
import { firstNode, getNodeData, getFirstChildElement } from './utils/index'

export default function processFault (wsdl, fault, context) {
  let faultCode = getNodeData(firstNode(fault.getElementsByTagName('faultcode')))
  let faultString = getNodeData(firstNode(fault.getElementsByTagName('faultstring')))
  let faultNode = getFirstChildElement(firstNode(fault.getElementsByTagName('detail')))
  let typeAttr = wsdl.getTypeAttribute(faultNode)
  let faultTypeName = typeAttr.value || typeAttr.nodeValue || faultNode.localName
  let faultType = wsdl.getTypeByLocalNS(faultNode.namespaceURI, faultTypeName)

  return {
    faultCode,
    message: faultString,
    type: faultTypeName,
    detail: deserialize(wsdl, faultType, faultNode, context)
  }
}