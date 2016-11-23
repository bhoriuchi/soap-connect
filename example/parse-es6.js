// old size
import cred from '../credentials'
import soap from '../src/index'
import fs from 'fs'

soap.createClient(cred.wsdl, { ignoreSSL: true, cache: false }).then((client) => {
  fs.writeFileSync('meta-v2.txt', JSON.stringify(client.wsdl, null, '  '))
})
