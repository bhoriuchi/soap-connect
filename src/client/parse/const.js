import _ from 'lodash'

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

export const XSD = {
  anyType (obj) {
    return obj
  },
  string (obj) {
    return _.toString(obj)
  },
  normalizedString (obj) {
    return _.toString(obj).replace(/[\n\r\t]/g, ' ')
  },
  token (obj) {
    return _.toString(obj).replace(/\s+/g, ' ').trim()
  },
  boolean (obj) {
    obj = _.toLower(_.toString(obj));
    return (obj === 'true' || obj === '1') ? true : false
  },
  byte (obj) {
    return _.toString(obj)
  },
  decimal (obj) {
    return _.toNumber(obj)
  },
  float (obj) {
    return _.toNumber(obj)
  },
  double (obj) {
    return _.toNumber(obj)
  },
  int (obj) {
    return _.toNumber(obj)
  },
  integer (obj) {
    return _.toNumber(obj)
  },
  long (obj) {
    return _.toNumber(obj)
  },
  negativeInteger (obj) {
    return _.toNumber(obj)
  },
  nonNegativeInteger (obj) {
    return _.toNumber(obj)
  },
  nonPositiveInteger (obj) {
    return _.toNumber(obj)
  },
  positiveInteger (obj) {
    return _.toNumber(obj)
  },
  short (obj) {
    return _.toNumber(obj)
  },
  unsignedLong (obj) {
    return _.toNumber(obj)
  },
  unsignedInt (obj) {
    return _.toNumber(obj)
  },
  unsignedShort (obj) {
    return _.toNumber(obj)
  },
  unsignedByte (obj) {
    return _.toNumber(obj)
  },
  duration (obj) {
    return _.toString(obj)
  },
  dateTime (obj) {
    return new Date(obj)
  },
  time (obj) {
    return new Date(obj)
  },
  date (obj) {
    return new Date(obj)
  },
  base64Binary (obj) {
    return _.toString(obj)
  },
  hexBinary (obj) {
    return _.toString(obj)
  }
}

export const WSDL_SCHEMAS = {
  'http://www.w3.org/2001/XMLSchema': _.mapValues(XSD, () => {
    return (obj) => {
      return { $value: obj.$value || obj }
    }
  })
}