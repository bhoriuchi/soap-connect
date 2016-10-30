import cred from '../credentials'
import SoapClient from '../src/client/index'
import _ from 'lodash'

SoapClient(cred.wsdl, { ignoreSSL: true, cache: false }).then((client) => {
  // console.log('res', JSON.stringify(_.omit(res, ['types']), null, '  '))
  //client.VimService.VimPort.RetrieveServiceContent()
})
.catch((err) => {
  console.error('err', err)
})