import cred from '../credentials'
import soap from '../src/index'
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

soap.createClient(cred.wsdl, { ignoreSSL: true, cache: true }).then((client) => {
  let vim = client.services.VimService.VimPort


  return vim.RetrieveServiceContent({
    _this: {
      $attributes: { type: 'ServiceInstance' },
      $value: 'ServiceInstance'
    }
  })
    .then((si) => {
      let sc = si.returnval

      return vim.Login({
        _this: sc.sessionManager,
        userName: cred.username,
        password: cred.password
      })
        .then((session) => {
          let cookie = _.first(_.get(client.lastResponse.headers, '["set-cookie"][0]').split(';'))
          client.setSecurity(soap.Security.CookieSecurity(cookie))

          return vim.CreateContainerView({
            _this: sc.viewManager,
            container: sc.rootFolder,
            type: ['VirtualMachine'],
            recursive: true
          })
            .then((view) => {
              let allVMs = {
                _this: sc.propertyCollector,
                specSet: [
                  {
                    objectSet: [
                      {
                        obj: view.returnval,
                        skip: true,
                        selectSet: [
                          {
                            type: 'ContainerView',
                            path: 'view',
                            skip: false
                          }
                        ]
                      }
                    ],
                    propSet: [
                      {
                        all: false,
                        pathSet: ['name'],
                        type: 'VirtualMachine'
                      }
                    ]
                  }
                ],
                options: {}
              }

              // console.log(JSON.stringify(client.types.vim25.RetrievePropertiesEx(allVMs), null, '  '))

              return vim.RetrievePropertiesEx(allVMs)
                .then((vms) => {
                  console.log(vms)
                  return vms
                })
            })
        })
        .then(() => {
          return vim.Logout({
            _this: sc.sessionManager
          })
        })
    })
    .then((res) => {
      console.log(res)
      console.log('Run time:', (Date.now() - start) / 1000, 'seconds')
    })
})
.catch((err) => {
  // console.error('err', err)
  console.error(err.faultString)
  console.error('====================')
  console.error(err.requestBody.replace(/(>)\s*(<)(\/*)/g, '$1\r\n$2$3'))
})