import soap from '../src/index'
import cred from '../credentials'

soap.createClient(cred.wsdl, { ignoreSSL: true, cache: true }).then((client) => {
  let spec = client.types.vim25.PropertyFilterSpec({
    objectSet: [
      {
        obj: {
          type: 'VirtualMachine',
          value: 'vm-101'
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

  console.log(JSON.stringify(spec, null, '  '))
  /*
  client.types.vim25.ManagedObjectReference({
    type: 'VirtualMachine',
    value: 'vm-101'
  })
  */
})