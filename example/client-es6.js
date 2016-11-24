import soap from '../src/index'
import cred from '../credentials'
import builder from 'xmlbuilder'

soap.createClient(cred.wsdl, { ignoreSSL: true, cache: true }).then((client) => {
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

  // console.log(JSON.stringify(spec, null, '  '))
  // console.log(builder.create(spec).end({ pretty: true }))
  client.services.VimService.VimPort.RetrievePropertiesEx(spec).then((res) => {
    console.log(res)
  })
  /*
  client.types.vim25.ManagedObjectReference({
    type: 'VirtualMachine',
    value: 'vm-101'
  })
  */
})