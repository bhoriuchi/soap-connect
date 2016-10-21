export const SOAP_DEFINITION = {
  'http://schemas.xmlsoap.org/wsdl/soap/': {
    version: '1.1',
    envelope: 'http://schemas.xmlsoap.org/soap/envelope/',
    httpTransport: 'http://schemas.xmlsoap.org/soap/http'
  },
  'http://schemas.xmlsoap.org/wsdl/soap12/': {
    version: '1.2',
    envelope: 'http://www.w3.org/2003/05/soap-envelope',
    httpTransport: 'http://schemas.xmlsoap.org/soap/http'
  }
}