import cred from '../credentials'
import SoapClient from '../src/client/index'
import _ from 'lodash'

SoapClient(cred.wsdl, { ignoreSSL: true, cache: true }).then((client) => {
  // console.log('res', JSON.stringify(_.omit(res, ['types']), null, '  '))
  client.services.VimService.VimPort.RetrieveServiceContent({ _this: 'ServiceInstance' })
  // let o = client.types.vim25.RetrieveServiceContent({ _this: 'ServiceInstance' })
  // let o = client._meta.namespaces.vim25.types.ManagedObjectReference
  // console.log(JSON.stringify(o, null, '  '))
})
.catch((err) => {
  console.error('err', err)
})