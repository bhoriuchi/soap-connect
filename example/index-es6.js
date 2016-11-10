import cred from '../credentials'
import SoapClient from '../src/client/index'
import _ from 'lodash'

let testSvcs = {
  // wsdl: 'http://www.webservicex.net/CurrencyConvertor.asmx?WSDL'
  // wsdl: 'http://www.webservicex.com/globalweather.asmx?wsdl'
  // wsdl: 'http://wsf.cdyne.com/WeatherWS/Weather.asmx?WSDL'
  // wsdl: 'http://www.thomas-bayer.com/axis2/services/BLZService?wsdl'
  wsdl: 'http://www.w3schools.com/xml/tempconvert.asmx?wsdl'
}

let start = Date.now()

SoapClient(cred.wsdl, { ignoreSSL: true, cache: true }).then((client) => {
  // console.log(JSON.stringify(client.wsdl.namespaces, null, '  '))
  // console.log(client._wsdl.namespaces['urn:vim25'].messages)
  // console.log('res', JSON.stringify(_.omit(res, ['types']), null, '  '))

  /*
  console.log(JSON.stringify(client.types.vim25.RetrieveServiceContent({
    _this: {
      $attributes: { type: 'hi' },
      $value: 'ServiceInstance'
    }
  }), null, '  '))
  */

  /*
  return client.services.TempConvert.TempConvertSoap.FahrenheitToCelsius({ Fahrenheit: '100' }).then((res) => {
    console.log(res)
  })
    .catch((err) => {
      console.log('ERR', err)
    })
    */

  return client.services.VimService.VimPort.RetrieveServiceContent({ _this: 'ServiceInstance' })
    .then((res) => {
      console.log(res)
      console.log('Run time:', (Date.now() - start) / 1000, 'seconds')
    })
  // let o = client.types.vim25.RetrieveServiceContent({ _this: 'ServiceInstance' })
  // let o = client._meta.namespaces.vim25.types.ManagedObjectReference
  // console.log(JSON.stringify(o, null, '  '))
})
.catch((err) => {
  console.error('err', err)
})