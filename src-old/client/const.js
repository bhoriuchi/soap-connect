export const SOAP = {
  'http://schemas.xmlsoap.org/wsdl/soap/': {
    version: '1.1',
    ns: 'http://schemas.xmlsoap.org/wsdl/soap/',
    envelope: 'http://schemas.xmlsoap.org/soap/envelope/',
    contentType: 'text/xml'
  },
  'http://schemas.xmlsoap.org/wsdl/soap12/': {
    version: '1.2',
    ns: 'http://schemas.xmlsoap.org/wsdl/soap12/',
    envelope: 'http://www.w3.org/2003/05/soap-envelope',
    contentType: 'application/soap+xml'
  }
}

export const XS_NS = 'http://www.w3.org/2001/XMLSchema'
export const WSDL_NS = 'http://schemas.xmlsoap.org/wsdl/'

export default {
  SOAP,
  XS_NS,
  WSDL_NS
}