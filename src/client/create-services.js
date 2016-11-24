import _ from 'lodash'

export default function createServices (wsdl, types) {
  let services = {}
  _.forEach(wsdl.metadata.namespaces, (namespace, nsIdx) => {
    _.forEach(namespace.ports, (port, portIdx) => {
      _.forEach(port.operations, (opName, opIdx) => {
        let opPath = `["${port.service}"]["${port.name}"]["${opName}"]`
        _.set(services, opPath, (data, options, callback) => {
          if (_.isFunction(options)) {
            callback = options
            options = {}
          }
          callback = _.isFunction(callback) ? callback : () => false

          return new Promise((resolve, reject) => {
            let op = wsdl.getOp([nsIdx, portIdx, opIdx])

            callback(null, op)
            return resolve(op)
          })
        })
      })
    })
  })
  return services
}