import cred from '../credentials'
import SoapClient from '../src/client/index'
import _ from 'lodash'
import fs from 'fs'

let testSvcs = {
  // wsdl: 'http://www.webservicex.net/CurrencyConvertor.asmx?WSDL'
  // wsdl: 'http://www.webservicex.com/globalweather.asmx?wsdl'
  // wsdl: 'http://wsf.cdyne.com/WeatherWS/Weather.asmx?WSDL'
  // wsdl: 'http://www.thomas-bayer.com/axis2/services/BLZService?wsdl'
  wsdl: 'http://www.w3schools.com/xml/tempconvert.asmx?wsdl'
}

let start = Date.now()

SoapClient(cred.wsdl, { ignoreSSL: true, cache: true }).then((client) => {
  let vim = client.services.VimService.VimPort
  // console.log(client.wsdl)
  fs.writeFileSync('meta.txt', JSON.stringify(client.wsdl, null, '  '))
  // console.log('Run time:', (Date.now() - start) / 1000, 'seconds')
  // console.log(JSON.stringify(client.wsdl.namespaces, null, '  '))
  // console.log(client._wsdl.namespaces['urn:vim25'].messages)
  // console.log('res', JSON.stringify(_.omit(res, ['types']), null, '  '))

  /*
  console.log(client.wsdl.namespaces['urn:vim25'].types.CustomizationIPSettings)
  console.log('=========================')
  console.log(JSON.stringify(client.types.vim25.CustomizationIPSettings({
    dnsDomain: 'blah.com',
    dnsServerList: ['8.8.8.8', '1.1.1.1'],
    ip: {
      dynamicProperty: [
        { name: 'ip', val: '10.10.10.1' }
      ]
    }
  }), null, '  '))
*/

  /*
  return client.services.VimService.VimPort.CustomizeVM_Task({
    _this: { $value: 'ServiceInstance', $attributes: { type: 'VirtualMachine' } },
    spec: {
      globalIPSettings: {
        dnsServerList: ['1.1.1.1', '8.8.8.8']
      }
    }
  })
    .then((res) => {
      console.log(res)
      console.log('Run time:', (Date.now() - start) / 1000, 'seconds')
    })
*/
  /*
  return client.services.TempConvert.TempConvertSoap.FahrenheitToCelsius({ Fahrenheit: '100' }).then((res) => {
    console.log(res)
  })
    .catch((err) => {
      console.log('ERR', err)
    })
    */

  /*
  console.log(client.types.vim25.ManagedObjectReference({
    type: 'ServiceInstance',
    value: 'ServiceInstance'
  }))
  */

  return vim.RetrieveServiceContent({
    _this: {
      $attributes: { type: 'ServiceInstance' },
      $value: 'ServiceInstance'
    }
  })
    .then((sc) => {
      return vim.Login({
        _this: sc.returnval.sessionManager,
        userName: cred.username,
        password: cred.password
      })
        .then((session) => {
          let cookie = _.first(_.get(client.lastResponse.headers, '["set-cookie"][0]').split(';'))
          // console.log(client.lastResponse.headers)
          client.setSecurity(client.Security.CookieSecurity(cookie))
          return session
        })
    })
  /*
  return client.services.VimService.VimPort.RetrievePropertiesEx({
      "_this": {
        "$attributes": {
          "type": "PropertyCollector"
        },
        "$value": "ha-property-collector"
      },
      "specSet": [
        {
          "$attributes": {
            "xsi:type": "PropertyFilterSpec"
          },
          "propSet": [
            {
              "$attributes": {
                "xsi:type": "PropertySpec"
              },
              "type": "VirtualMachine",
              "pathSet": [
                "name"
              ]
            }
          ],
          "objectSet": [
            {
              "$attributes": {
                "xsi:type": "ObjectSpec"
              },
              "obj": {
                "$attributes": {
                  "type": "ContainerView"
                },
                "$value": "session[52f7c835-1548-257e-7de1-fa42dbdf50ba]528d41dc-d50e-7d1d-43e1-313ccf355722"
              },
              "skip": true,
              "selectSet": [
                {
                  "type": "ContainerView",
                  "path": "view"
                }
              ]
            }
          ]
        }
      ],
      "options": {
        "$attributes": {
          "xsi:type": "RetrieveOptions"
        }
      }
    }
  )
  */
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