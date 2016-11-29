import soap from '../src/index'
import cred from '../credentials'

let ts = Date.now()

soap.createClient(cred.wsdl, { ignoreSSL: true, cache: true }, (err, client) => {
  if (err) return console.error(err)

  let VimPort = client.services.VimService.VimPort

  return VimPort.RetrieveServiceContent({
    _this: {
      type: 'ServiceInstance',
      value: 'ServiceInstance'
    }
  })
    .then((sc) => {
      console.log('Run Time:', (Date.now() - ts) / 1000, 'seconds')
      console.log(JSON.stringify(sc, null, '  '))
    })
    .catch(console.error)
})