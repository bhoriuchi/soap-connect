import deserialize from './deserialize'
import { firstNode, getNodeData, getFirstChildElement } from './utils/index'

export default function processFault (wsdl, fault) {
  let faultCode = getNodeData(firstNode(fault.getElementsByTagName('faultcode')))
  let faultString = getNodeData(firstNode(fault.getElementsByTagName('faultstring')))
  let faultNode = getFirstChildElement(firstNode(fault.getElementsByTagName('detail')))
  let typeAttr = wsdl.getTypeAttribute(faultNode)
  let faultTypeName = typeAttr.value || typeAttr.nodeValue || faultNode.localName
  let faultType = wsdl.getTypeByLocalNS(faultNode.namespaceURI, faultTypeName)

  return {
    faultCode,
    faultString,
    fault: deserialize(wsdl, faultType, faultNode)
  }
}