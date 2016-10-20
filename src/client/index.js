export class SoapConnectClient {
  constructor (mainWSDL, options = {}) {
    if (!mainWSDL) throw new Error('No WSDL provided')

    this._mainWSDL = mainWSDL
    this._options = options
    this.$$ = options.metaPrefix || '$$'
  }
}

export default function (mainWSDL, options = {}) {
  return new SoapConnectClient(mainWSDL, options)
}