import cred from '../credentials'
import SoapClient from '../src/client/index'
import _ from 'lodash'

SoapClient(cred.wsdl, { ignoreSSL: true, cache: true }).then((client) => {
  // console.log('res', JSON.stringify(_.omit(res, ['types']), null, '  '))
  client.VimService.VimPort.RetrieveServiceContent()
  //console.log(client)
})
.catch((err) => {
  console.error('err', err)
})