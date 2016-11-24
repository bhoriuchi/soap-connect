/*
import soap from '../src/index'
import fs from 'fs'

soap.createClient(cred.wsdl, { ignoreSSL: true, cache: false }).then((client) => {
  fs.writeFileSync('meta-v2.txt', JSON.stringify(client.wsdl, null, '  '))
})
*/
import cred from '../credentials'
import WSDL from '../src/client/wsdl/index'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

WSDL(cred.wsdl)