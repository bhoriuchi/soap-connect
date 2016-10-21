import cred from '../credentials'
import client from '../src/client/index'
import _ from 'lodash'

client(cred.wsdl, { ignoreSSL: true, cache: true }).then((c) => {
  // console.log('res', JSON.stringify(_.omit(res, ['types']), null, '  '))
  console.log(c)
})
.catch((err) => {
  console.error('err', err)
})