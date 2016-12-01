import cred from '../credentials'
import soap from '../src/index'
import _ from 'lodash'
import fs from 'fs'
import chalk from 'chalk'

let testSvcs = {
  // wsdl: 'http://www.webservicex.net/CurrencyConvertor.asmx?WSDL'
  // wsdl: 'http://www.webservicex.com/globalweather.asmx?wsdl'
  // wsdl: 'http://wsf.cdyne.com/WeatherWS/Weather.asmx?WSDL'
  // wsdl: 'http://www.thomas-bayer.com/axis2/services/BLZService?wsdl'
  wsdl: 'http://www.w3schools.com/xml/tempconvert.asmx?wsdl'
}

let start = Date.now()

let specSet = [
  {
    "objectSet": [
      {
        "obj": {
          "type": "VirtualMachine",
          "value": "vm-16"
        }
      }
    ],
    "propSet": [
      {
        "all": false,
        "pathSet": [
          "config.hardware.device",
          "name"
        ],
        "type": "VirtualMachine"
      }
    ]
  }
]

soap.createClient(cred.wsdl, { ignoreSSL: true, cache: true }).then((client) => {
  let vim = client.services.VimService.VimPort

  /*
  client.on('soap.request', (r) => {
    console.log(chalk.blue(r.body))
  })
  */

  client.on('soap.response', (r) => {
    console.log(chalk.green(r.body))
  })

  /*
  client.on('soap.error', (r) => {
    console.log(chalk.red(r.error))
  })

  client.on('soap.fault', (r) => {
    console.log(chalk.red(r.body))
  })
  */


  return vim.RetrieveServiceContent({
    _this: {
      type: 'ServiceInstance',
      value: 'ServiceInstance'
    }
  })
    .then((si) => {
      let sc = si.returnval

      console.log(JSON.stringify(sc, null, '  '))

      return vim.Login({
        _this: sc.sessionManager,
        userName: cred.username,
        password: cred.password
      })
        .then((session) => {
          client.setSecurity(soap.Security.CookieSecurity(client.lastResponse.headers))
          return vim.RetrievePropertiesEx({
            _this: sc.propertyCollector,
            specSet,
            options: {}
          })
            .then((res) => {
              console.log(JSON.stringify(res, null, '  '))
            })
          /*
          return vim.RetrievePropertiesEx({
            _this: sc.propertyCollector,
            specSet: [
              {
                propSet: [
                  {
                    type: 'SessionManager',
                    pathSet: ['sessionList']
                  }
                ],
                objectSet: [
                  {
                    obj: {
                      type: 'SessionManager',
                      value: 'SessionManager'
                    }
                  }
                ]
              }
            ],
            options: {}
          })
            .then((sessions) => {
              console.log(JSON.stringify(sessions, null, '  '))
            })
*/
/*
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
                        pathSet: ['name'],
                        type: 'VirtualMachine'
                      }
                    ]
                  }
                ],
                options: {}
              }

              return vim.RetrievePropertiesEx(allVMs)
                .then((vms) => {
                  console.log(JSON.stringify(vms, null, '  '))
                  return vms
                })
            })
*/

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
  console.error('error', err)
})