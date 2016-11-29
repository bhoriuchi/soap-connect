import soap from '../src/index'
import cred from '../credentials'
// import builder from 'xmlbuilder'

let ts = Date.now()

soap.createClient(cred.wsdl, { ignoreSSL: true, cache: true }).then((client) => {
  client.on('request', (r) => {
    console.log(r.body)
  })
  /*
  let spec = client.types.vim25.PropertyFilterSpec({
    objectSet: [
      {
        obj: {
          type: 'VirtualMachine',
          value: 'vm-101'
        }
      },
      {
        obj: {
          type: 'VirtualMachine',
          value: 'vm-300'
        }
      }
    ],
    propSet: [
      {
        pathSet: ['name'],
        type: 'VirtualMachine'
      }
    ]
  })
  */

  let VimPort = client.services.VimService.VimPort

  return VimPort.RetrieveServiceContent({
    _this: {
      type: 'ServiceInstance',
      value: 'ServiceInstance'
    }
  })

  // console.log(JSON.stringify(spec, null, '  '))
  // console.log(builder.create(spec).end({ pretty: true }))
  /*
  client.services.VimService.VimPort.RetrievePropertiesEx({
    _this: {
      type: '',
      value: ''
    },
    specSet: [
      {
        objectSet: [
          {
            obj: {
              type: 'VirtualMachine',
              value: 'vm-101'
            }
          },
          {
            obj: {
              type: 'VirtualMachine',
              value: 'vm-300'
            }
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
  })
    */

    .then((res) => {
      console.log('Run Time:', (Date.now() - ts) / 1000, 'seconds')
      console.log(res)
    })
  /*
  client.types.vim25.ManagedObjectReference({
    type: 'VirtualMachine',
    value: 'vm-101'
  })
  */
})