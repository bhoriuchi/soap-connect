import soap from '../src/index'
import cred from '../credentials'

soap.createClient(cred.wsdl, { ignoreSSL: true, cache: true }).then((client) => {
  client.types.vim25.ManagedObjectReference({
    type: 'VirtualMachine',
    value: 'vm-101'
  })
})