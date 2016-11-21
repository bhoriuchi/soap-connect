import cred from '../credentials'
import soap from '../src/index'
import _ from 'lodash'

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
            type: 'VirtualMachine',
            recursive: true
          })
            .then((view) => {
              return vim.RetrievePropertiesEx({
                _this: sc.propertyCollector,
                specSet: [
                  {
                    objSet: [
                      {
                        obj: view,
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
              })
                .then((vms) => {
                  console.log(vms)
                  return vms
                })
            })
        })
    })
    .then((res) => {
      console.log(res)
      console.log('Run time:', (Date.now() - start) / 1000, 'seconds')
    })
})
.catch((err) => {
  console.error('err', err)
})