import cred from '../credentials'
import SoapClient from '../src/client/index'
import _ from 'lodash'

let start = Date.now()

SoapClient(cred.wsdl, { ignoreSSL: true, cache: true }).then((client) => {
  console.log(JSON.stringify(client._wsdl.namespaces['urn:vim25'].bindings, null, '  '))
  // console.log(client._wsdl.namespaces['urn:vim25'].messages)
  // console.log('res', JSON.stringify(_.omit(res, ['types']), null, '  '))
  /*
  client.services.VimService.VimPort.RetrieveServiceContent({ _this: 'ServiceInstance' })
    .then((res) => {
      console.log(res)
      console.log('Run time:', (Date.now() - start) / 1000, 'seconds')
    })
    */
  // let o = client.types.vim25.RetrieveServiceContent({ _this: 'ServiceInstance' })
  // let o = client._meta.namespaces.vim25.types.ManagedObjectReference
  // console.log(JSON.stringify(o, null, '  '))
})
.catch((err) => {
  console.error('err', err)
})